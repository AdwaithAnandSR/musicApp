const path = require('path');
const fs = require('fs');
const pLimit = require('p-limit');
const { extractMetadata, downloadAudioAndCover } = require('./ytdlp');
const { checkIsExists, addSongToDb } = require('./dbCheck');
const { uploadAudio, uploadImage, isCloudinaryConfigured } = require('./cloudinary');
const { saveSongMetadata, initStorage } = require('./metadataManager');
const { parseUrls } = require('./urlUtils');

class JobManager {
  constructor(downloadsDir, broadcaster) {
    this.downloadsDir = downloadsDir;
    this.songsDir = path.join(downloadsDir, 'songs');
    this.coversDir = path.join(downloadsDir, 'covers');
    this.broadcaster = broadcaster;
    
    // Key: jobId -> Job state object
    this.jobs = new Map();

    initStorage(this.downloadsDir);
  }

  getJob(jobId) {
    return this.jobs.get(jobId);
  }

  getAllJobs() {
    return Array.from(this.jobs.values()).map(j => ({
      id: j.id,
      url: j.url,
      urls: j.urls || parseUrls(j.url),
      skip: j.skip,
      limit: j.limit,
      status: j.status,
      totalExtracted: j.totalExtracted,
      processedCount: j.processedCount,
      completedCount: j.completedCount,
      skippedCount: j.skippedCount,
      failedCount: j.failedCount,
      createdAt: j.createdAt,
      error: j.error,
      logs: j.logs || []
    }));
  }

  broadcast(type, data) {
    if (this.broadcaster) {
      this.broadcaster(type, data);
    }
  }

  addLog(jobId, message, level = 'info') {
    const job = this.jobs.get(jobId);
    const logEntry = {
      timestamp: new Date().toISOString(),
      message,
      level
    };
    if (job) {
      job.logs.push(logEntry);
    }
    this.broadcast('JOB_LOG', { jobId, log: logEntry });
  }

  updateItemStatus(jobId, ytId, status, details = {}) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    const item = job.items.find(i => i.ytId === ytId);
    if (item) {
      item.status = status;
      if (details.error) item.error = details.error;
      if (details.songUrl) item.songUrl = details.songUrl;
      if (details.coverUrl) item.coverUrl = details.coverUrl;
      item.updatedAt = new Date().toISOString();

      this.broadcast('ITEM_STATUS_CHANGED', {
        jobId,
        ytId,
        item,
        summary: this.getJobSummary(job)
      });
    }
  }

  getJobSummary(job) {
    return {
      total: job.items.length,
      pending: job.items.filter(i => i.status === 'PENDING').length,
      checkingDb: job.items.filter(i => i.status === 'CHECKING_DB').length,
      downloading: job.items.filter(i => i.status === 'DOWNLOADING').length,
      uploadingCloudinary: job.items.filter(i => i.status === 'UPLOADING_CLOUDINARY').length,
      registeringDb: job.items.filter(i => i.status === 'REGISTERING_DB').length,
      completed: job.items.filter(i => i.status === 'COMPLETED').length,
      skipped: job.items.filter(i => i.status === 'SKIPPED').length,
      failed: job.items.filter(i => i.status === 'FAILED').length
    };
  }

  /**
   * Starts a new migration pipeline job
   */
  async startJob({ url, urls, skip = 0, limit = 0 }) {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const parsedUrls = parseUrls(urls || url);
    const displayUrl = parsedUrls.length > 1 ? JSON.stringify(parsedUrls) : (parsedUrls[0] || '');
    
    const job = {
      id: jobId,
      url: displayUrl,
      urls: parsedUrls,
      skip: Number(skip) || 0,
      limit: Number(limit) || 0,
      status: 'EXTRACTING_METADATA',
      totalExtracted: 0,
      processedCount: 0,
      completedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      createdAt: new Date().toISOString(),
      items: [],
      logs: [],
      error: null,
      cancelled: false
    };

    this.jobs.set(jobId, job);
    this.broadcast('JOB_CREATED', { job: this.getJobSummary(job), jobId, url: displayUrl, urls: parsedUrls });
    this.addLog(jobId, `Started metadata extraction for ${parsedUrls.length} URL(s): ${displayUrl}`);

    this.runPipeline(jobId).catch(err => {
      this.addLog(jobId, `Fatal job error: ${err.message}`, 'error');
      job.status = 'FAILED';
      job.error = err.message;
      this.broadcast('JOB_FAILED', { jobId, error: err.message });
    });

    return jobId;
  }

  /**
   * Main pipeline process
   */
  async runPipeline(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    // 1. Extract metadata using yt-dlp
    let allItems = [];
    try {
      allItems = await extractMetadata(job.urls.length > 0 ? job.urls : job.url);
      job.totalExtracted = allItems.length;
      this.addLog(jobId, `Extracted ${allItems.length} total tracks from YouTube URL(s).`);
    } catch (err) {
      job.status = 'FAILED';
      job.error = err.message;
      this.addLog(jobId, `Metadata extraction failed: ${err.message}`, 'error');
      this.broadcast('JOB_FAILED', { jobId, error: err.message });
      return;
    }

    // 2. Pagination / Slice applying skip and limit
    let slicedItems = allItems;
    const skip = job.skip;
    const limit = job.limit;

    if (skip > 0) {
      slicedItems = slicedItems.slice(skip);
    }
    if (limit > 0) {
      slicedItems = slicedItems.slice(0, limit);
    }

    this.addLog(jobId, `Processing ${slicedItems.length} tracks after pagination (skip: ${skip}, limit: ${limit || 'all'}).`);

    job.items = slicedItems.map(item => ({
      ...item,
      status: 'PENDING',
      error: null,
      songUrl: null,
      coverUrl: null
    }));

    job.status = 'PROCESSING';
    this.broadcast('JOB_STARTED', { jobId, summary: this.getJobSummary(job) });

    // 3. Concurrency Queue (LIMIT EXACTLY 2 CONCURRENT WORKERS)
    const limitConcurrency = pLimit(2);

    const downloadTasks = job.items.map(item => {
      return limitConcurrency(async () => {
        if (job.cancelled) {
          this.updateItemStatus(jobId, item.ytId, 'FAILED', { error: 'Job cancelled by user' });
          return;
        }

        // STEP 1: Pre-flight DB check (POST /isExists with title and ytId)
        this.updateItemStatus(jobId, item.ytId, 'CHECKING_DB');
        this.addLog(jobId, `Checking if track "${item.title}" (${item.ytId}) exists in VividMusic DB...`);

        let exists = false;
        try {
          exists = await checkIsExists(item.ytId, item.title);
        } catch (err) {
          this.addLog(jobId, `Database check warning for ${item.ytId}: ${err.message}`, 'warning');
        }

        if (exists) {
          job.skippedCount++;
          job.processedCount++;
          this.updateItemStatus(jobId, item.ytId, 'SKIPPED');
          this.addLog(jobId, `Track "${item.title}" (${item.ytId}) already exists in database. SKIPPED.`);
          return;
        }

        // STEP 2: Download temporary audio & cover locally
        this.updateItemStatus(jobId, item.ytId, 'DOWNLOADING');
        this.addLog(jobId, `Downloading temporary media for "${item.title}" (${item.ytId})...`);

        let localPaths = null;
        try {
          localPaths = await downloadAudioAndCover(
            item.ytId,
            item.title,
            this.songsDir,
            this.coversDir,
            (logMsg) => this.addLog(jobId, logMsg)
          );
        } catch (err) {
          job.failedCount++;
          job.processedCount++;
          this.updateItemStatus(jobId, item.ytId, 'FAILED', { error: err.message });
          this.addLog(jobId, `Failed downloading "${item.title}" (${item.ytId}): ${err.message}`, 'error');
          return;
        }

        const absoluteSongPath = path.resolve(__dirname, '../../../', localPaths.songPath);
        const absoluteCoverPath = localPaths.coverPath ? path.resolve(__dirname, '../../../', localPaths.coverPath) : null;

        let cloudinarySongUrl = null;
        let cloudinaryCoverUrl = null;

        // STEP 3: Upload to Cloudinary (If configured)
        if (isCloudinaryConfigured()) {
          this.updateItemStatus(jobId, item.ytId, 'UPLOADING_CLOUDINARY');
          this.addLog(jobId, `Uploading track "${item.title}" (${item.ytId}) to Cloudinary...`);

          try {
            cloudinarySongUrl = await uploadAudio(absoluteSongPath, item.ytId);
            this.addLog(jobId, `Uploaded audio to Cloudinary: ${cloudinarySongUrl}`);

            if (absoluteCoverPath && fs.existsSync(absoluteCoverPath)) {
              cloudinaryCoverUrl = await uploadImage(absoluteCoverPath, item.ytId);
              this.addLog(jobId, `Uploaded cover image to Cloudinary: ${cloudinaryCoverUrl}`);
            }
          } catch (err) {
            this.addLog(jobId, `Cloudinary upload warning: ${err.message}`, 'warning');
          }
        } else {
          this.addLog(jobId, `Cloudinary credentials not set in .env file. Falling back to local storage URL.`, 'warning');
          const baseUrl = process.env.RENDER_EXTERNAL_URL || process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5000}`;
          cloudinarySongUrl = `${baseUrl}/${localPaths.songPath}`;
          cloudinaryCoverUrl = localPaths.coverPath ? `${baseUrl}/${localPaths.coverPath}` : item.thumbnail;
        }

        // STEP 4: Store new song info into VividMusic DB (POST /addSong)
        this.updateItemStatus(jobId, item.ytId, 'REGISTERING_DB');
        this.addLog(jobId, `Registering "${item.title}" in VividMusic database via POST /addSong...`);

        try {
          const dbResult = await addSongToDb({
            title: item.title,
            artist: item.channel,
            url: cloudinarySongUrl,
            cover: cloudinaryCoverUrl || item.thumbnail,
            duration: item.duration,
            ytId: item.ytId,
            lang: 'English'
          });

          this.addLog(jobId, `Successfully stored song in VividMusic DB for ${item.ytId}`);
        } catch (err) {
          this.addLog(jobId, `Warning storing song in DB: ${err.message}`, 'warning');
        }

        // STEP 5: CLEANUP LOCAL FILES (Strict requirement: do NOT keep audio/image files locally if Cloudinary is used)
        if (isCloudinaryConfigured()) {
          try {
            if (fs.existsSync(absoluteSongPath)) fs.unlinkSync(absoluteSongPath);
            if (absoluteCoverPath && fs.existsSync(absoluteCoverPath)) fs.unlinkSync(absoluteCoverPath);
            this.addLog(jobId, `Cleaned up local temporary files for ${item.ytId}`);
          } catch (cleanErr) {
            this.addLog(jobId, `Cleanup warning: ${cleanErr.message}`, 'warning');
          }
        }

        // Save metadata record
        saveSongMetadata(this.downloadsDir, {
          ytId: item.ytId,
          title: item.title,
          channel: item.channel,
          duration: item.duration,
          url: item.url,
          cloudinarySongUrl,
          cloudinaryCoverUrl,
          downloadedAt: new Date().toISOString()
        });

        job.completedCount++;
        job.processedCount++;
        this.updateItemStatus(jobId, item.ytId, 'COMPLETED', {
          songUrl: cloudinarySongUrl,
          coverUrl: cloudinaryCoverUrl
        });
        this.addLog(jobId, `Pipeline complete for "${item.title}" (${item.ytId}).`);
      });
    });

    await Promise.all(downloadTasks);

    job.status = job.cancelled ? 'CANCELLED' : 'COMPLETED';
    this.addLog(jobId, `Job ${jobId} finished. Completed: ${job.completedCount}, Skipped: ${job.skippedCount}, Failed: ${job.failedCount}.`);
    this.broadcast('JOB_FINISHED', { jobId, summary: this.getJobSummary(job) });
  }

  cancelJob(jobId) {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'PROCESSING') {
      job.cancelled = true;
      job.status = 'CANCELLED';
      this.addLog(jobId, `Cancellation requested for job ${jobId}`, 'warning');
      this.broadcast('JOB_CANCELLED', { jobId });
      return true;
    }
    return false;
  }
}

module.exports = JobManager;
