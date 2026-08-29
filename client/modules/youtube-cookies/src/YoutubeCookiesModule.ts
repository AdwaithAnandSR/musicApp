import { NativeModule, requireNativeModule } from 'expo';

declare class YoutubeCookiesModule extends NativeModule<{}> {
  getCookies(url: string): Promise<string | null>;
}

export default requireNativeModule<YoutubeCookiesModule>('YoutubeCookies');
