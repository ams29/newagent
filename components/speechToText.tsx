import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, StopCircle } from "lucide-react"; // Add StopCircle for the stop button
import axios from "axios";

// Add Modal component for popup (this can be customized according to your UI library)
import Modal from "@/components/ui/modal";
import Spinner from "@/components/ui/spinner";

interface SpeechToTextProps {
  onTranscribe: (text: string) => void;
}

const SpeechToText: React.FC<SpeechToTextProps> = ({ onTranscribe }) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // State to track processing
  const [showModal, setShowModal] = useState(false); // State for showing modal
  const [timeElapsed, setTimeElapsed] = useState(0); // Timer for recording duration
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const transcribeAudio = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("model", "whisper-1");
    formData.append("language", "en");
    try {
      const response = await axios.post(
        "https://api.openai.com/v1/audio/transcriptions",
        formData,
        {
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      const transcription = response.data.text;
      return transcription;
    } catch (error) {
      console.error("Error transcribing audio:", error);
      throw error;
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/wav",
        });
        const audioFile = new File([audioBlob], "audio.wav", {
          type: "audio/wav",
        });

        setIsProcessing(true); // Show processing state
        const transcribedText = await transcribeAudio(audioFile);
        onTranscribe(transcribedText);
        setIsProcessing(false); // Hide processing state
        setIsListening(false);
        setShowModal(false); // Hide modal after transcription
        clearInterval(timerRef.current!); // Stop the timer
        setTimeElapsed(0); // Reset the timer

        // Stop all tracks of the stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start();
      setIsListening(true);
      setShowModal(true); // Show modal when recording starts
      timerRef.current = setInterval(() => {
        setTimeElapsed((prev) => prev + 1);
      }, 1000); // Start the timer
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
  };

  const toggleListening = () => {
    if (!isListening) {
      startRecording();
    } else {
      stopRecording();
    }
  };

  // Format time in mm:ss format
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <>
      {/* Modal that shows while recording */}
      {showModal && (
        <Modal onClose={() => setShowModal(false)} open={showModal}>
          <div className="flex flex-col items-center bg-gray-900 text-white p-6 rounded-lg shadow-lg">
            <div className="w-12 h-12 mb-4 relative">
              <div className="absolute inset-0 bg-blue-500 rounded-full opacity-25 animate-ping"></div>
              <div className="relative flex items-center justify-center w-full h-full bg-blue-500 rounded-full">
                <Mic className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-lg font-semibold mb-2">{formatTime(timeElapsed)}</p>
            {isProcessing && <Spinner />}
            {isListening && (
              <Button 
                onClick={stopRecording} 
                className="mt-4 bg-transparent border border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-colors duration-300"
              >
                Stop
              </Button>
            )}
          </div>
        </Modal>
      )}

      {/* Button to start/stop recording */}
      <Button
        type="button"
        size="icon"
        onClick={toggleListening}
        className="bg-gray-800 text-gray-300 hover:text-white"
      >
        {/* Change icon based on recording state */}
        {isListening ? (
          <StopCircle className="h-4 w-4 text-red-500" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>
    </>
  );
};

export default SpeechToText;
