// @ts-check
import { defineConfig } from 'astro/config';

import image from "@astrojs/image";
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  integrations: [image()],
  integrations: [react()]
});