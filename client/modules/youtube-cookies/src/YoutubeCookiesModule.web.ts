import { registerWebModule, NativeModule } from 'expo';

class YoutubeCookiesModule extends NativeModule<{}> {}

export default registerWebModule(YoutubeCookiesModule, 'YoutubeCookiesModule');
