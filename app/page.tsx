"use client";
import { useEffect, useState } from "react";
import { Page } from "@/components/page";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function ChatPage() {
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();

  // Detect if the user is on a mobile deviceddeerr
  useEffect(() => {
    const userAgent = typeof window.navigator === "undefined" ? "" : navigator.userAgent;
    const isMobileDevice = /Mobi|Android|iPhone/i.test(userAgent);
    setIsMobile(isMobileDevice);
  }, []);

  if (isMobile) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-95 z-50">
        <div className="bg-gray-800 text-white rounded-xl shadow-lg p-6 w-full max-w-md mx-4">
          <h2 className="text-xl font-semibold mb-4 text-center">Mobile Access Limited</h2>
          <p className="text-gray-300 text-center mb-6">This site is optimized for desktop devices. For the best experience, please access it from a laptop or desktop computer.</p>
          <div className="flex justify-center space-x-4">
            <Button
              onClick={() => setIsMobile(false)}
              size="lg"
              className="bg-blue-600 text-white hover:bg-blue-700 transition-all duration-300"
            >
              Try it anyway
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <SignedIn>
        <Page />
      </SignedIn>
      <SignedOut>
        <div className="min-h-screen bg-gray-900 flex flex-col justify-center items-center text-white">
          <Button
            onClick={() => router.push("/signin")}
            size="lg"
            className="bg-white text-black hover:bg-gray-200 transition-all duration-300 transform hover:scale-105"
          >
            Get Started
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </SignedOut>
    </>
  );
}
