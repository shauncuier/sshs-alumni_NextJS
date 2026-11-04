/**
 * Note: When using the Node.JS APIs, the config file
 * doesn't apply. Instead, pass options directly to the APIs.
 *
 * All configuration options: https://remotion.dev/docs/config
 */

import { Config } from "@remotion/cli/config";

Config.setRspack(true);
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setDefaultPremountInSeconds(2);

// Use the GPU: ANGLE for Chrome's drawing and NVENC (GTX 1050 Ti) for H.264.
// NVENC can't take a CRF, so quality is set by bitrate. About 25% faster than CPU here.
Config.setChromiumOpenGlRenderer("angle");
Config.setHardwareAcceleration("if-possible");
Config.setVideoBitrate("10M");
