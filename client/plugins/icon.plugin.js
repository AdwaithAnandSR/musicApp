const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

module.exports = function withCustomDrawables(config) {
    return withDangerousMod(config, [
        "android",
        async config => {
            const projectRoot = config.modRequest.projectRoot;

            const drawableDir = path.join(
                projectRoot,
                "android/app/src/main/res/drawable"
            );
            const sourceDir = path.join(
                projectRoot,
                "assets/android-drawables"
            );

            if (fs.existsSync(sourceDir)) {
                fs.readdirSync(sourceDir).forEach(file => {
                    fs.copyFileSync(
                        path.join(sourceDir, file),
                        path.join(drawableDir, file)
                    );
                });
                console.log(
                    "✅ Copied custom drawables into android/app/src/main/res/drawable/"
                );
            } else {
                console.log(
                    "⚠️ No assets/android-drawables folder found, skipping..."
                );
            }

            return config;
        }
    ]);
};
