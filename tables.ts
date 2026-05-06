export interface VideoItem {
  user_id: string;
  video_id: string;

  video_name: string;
  video_key: string;
  video_status: "IN_PROGRESS" | "COMPLETED" | "FAILED";

  options: {
    transcription: {
      enabled: boolean;
      status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
      key?: string;
    };
    dub: {
      enabled: boolean;
      status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
      key?: string;
    };
  };

  created_at: string;
  updated_at: string;
}
