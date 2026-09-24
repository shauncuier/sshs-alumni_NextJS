import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SSGHS Alumni Association",
    short_name: "SSGHS Alumni",
    description:
      "Official community network for Sabuj Shikshayatan Government High School (সবুজ শিক্ষায়তন সরকারি উচ্চ বিদ্যালয়), Chattogram, Bangladesh.",
    start_url: "/",
    display: "standalone",
    background_color: "#06281e",
    theme_color: "#06281e",
    icons: [
      {
        src: "/logo.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
