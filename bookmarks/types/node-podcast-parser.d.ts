declare module 'node-podcast-parser' {
  export interface PodcastEpisode {
    title: string;
    description?: string;
    published?: Date;
    enclosure: {
      url: string;
      type?: string;
      filesize?: number;
    };
    duration?: number;
  }

  export interface ParsedPodcast {
    title: string;
    description?: string;
    episodes: PodcastEpisode[];
  }

  function parsePodcast(
    xmlData: string,
    callback: (err: Error | null, data: ParsedPodcast) => void
  ): void;

  export default parsePodcast;
}
