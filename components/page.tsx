"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ExternalLink,
  HelpCircle,
  MessageCircle,
  MoreHorizontal,
  ArrowRight,
  BookCheck,
  TargetIcon
} from "lucide-react";

import { useAuth, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import 'react-toastify/dist/ReactToastify.css';
import ChatSidebar from "@/components/chatSideBar";
import HeaderBar from "@/components/header";
import TopicIntroduction from "@/components/topicIntroduction";
import SpeechToText from "@/components/speechToText";


type ExpertType = 'General' | 'Real Estate' | 'Sales' | 'Marketing' | 'Negotiation' | 'Motivation';

export function Page() {
  const [inputValue, setInputValue] = useState("");
  const [currentExpert, setCurrentExpert] = useState<ExpertType>("General");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { isLoaded, isSignedIn, userId } = useAuth();
  const router = useRouter();
  const { signOut } = useClerk();
  const supabaseUrl = "https://cfkdwcrvjjpprhbmzzxz.supabase.co";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || "";
  const supabase = createClient(supabaseUrl, supabaseKey);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollHeight = scrollAreaRef.current.scrollHeight;
      scrollAreaRef.current.scrollTop = scrollHeight * 0.2; // Scroll to 20% of the content
    }
  }, [currentExpert]);

  useEffect(() => {
    
    async function fetchUserDetails() {
      
      if (isLoaded && isSignedIn) {
     
        const { data: user, error } = await supabase
          .from("user")
          .select("user_id")
          .eq("user_id", userId);

          if (Boolean(user) && user !== null && user.length === 0) {
            const { data, error } = await supabase
              .from("user")
              .insert([{ user_id: userId }])
              .select();
          }
      }
    }
    fetchUserDetails();
  }, [isLoaded, isSignedIn]);

  

  const handleSendMessage = async (message: string) => {
    if (message.trim()) {
      try {
        const chatId = uuidv4();
        const { data, error } = await supabase
          .from("chat")
          .insert([
            { chat_id: chatId, user_id: userId, coach_type: currentExpert },
          ])
          .select();
         
        router.push(`/chat/${chatId}?ques=${message}&new=true`);
      } catch (error) {
        console.log("error", error);
      }
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputValue);
    setInputValue("");
  };

  const handleExpertClick = (expert: ExpertType) => {
    setCurrentExpert(expert);
    setIsSidebarOpen(false);
  };

  const handleAskQuestion = (question: string) => {
    handleSendMessage(question);
  };


  const handleTranscription = (transcribedText: string) => {
    setInputValue((prev) => `${prev} ${transcribedText}`);
  };

  function handleActionClick(action: string): void {
    switch (action) {
      case 'examples':
        // Handle examples action
        break;
      case 'specific':
        // Handle specific action
        break;
      case 'understand':
        // Handle understand action
        break;
      case 'continue':
        // Handle continue action
        break;
      default:
        console.log('Unknown action:', action);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">

        {/* Header */}
        <HeaderBar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} signOut={signOut}/>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden pt-16">
          {" "}
          {/* Added pt-16 for header height */}
          {/* Sidebar */}
          <ChatSidebar userId={userId} supabase={supabase} isSidebarOpen={isSidebarOpen} handleExpertClick={handleExpertClick} />


          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col bg-gray-900 overflow-hidden">
            <ScrollArea className="flex-1" ref={scrollAreaRef}>
              <div className="p-4 space-y-4 min-h-[calc(100vh-12rem)]">

                  <div className="pt-8">
                    <TopicIntroduction
                      topic={currentExpert}
                      onAskQuestion={handleAskQuestion}
                    />
                  </div>
              </div>
            </ScrollArea>

            <div className="border-t border-gray-700 p-4">
              <div className="action-buttons flex justify-center space-x-4 mb-5">
                <button 
                  onClick={() => handleActionClick('examples')}
                  className="bg-gray-700 text-gray-200 px-2.5 py-1 rounded-md text-sm hover:bg-gray-600 hover:text-white transition-colors duration-200 flex items-center space-x-1.5 relative group"
                  title="Request specific examples related to the topic"
                >
                  <BookCheck className="h-3.5 w-3.5" />
                  <span>Give me examples</span>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 mb-2 whitespace-nowrap">
                    Request specific examples
                  </div>
                </button>
                <button 
                  onClick={() => handleActionClick('specific')}
                  className="bg-gray-700 text-gray-200 px-2.5 py-1 rounded-md text-sm hover:bg-gray-600 hover:text-white transition-colors duration-200 flex items-center space-x-1.5 relative group"
                  title="Ask for more detailed information"
                >
                  <TargetIcon className="h-3.5 w-3.5" />
                  <span>Be more specific</span>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 mb-2 whitespace-nowrap">
                    Ask for more details
                  </div>
                </button>
                <button 
                  onClick={() => handleActionClick('understand')}
                  className="bg-gray-700 text-gray-200 px-2.5 py-1 rounded-md text-sm hover:bg-gray-600 hover:text-white transition-colors duration-200 flex items-center space-x-1.5 relative group"
                  title="Request clarification on the topic"
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                  <span>I don't understand</span>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 mb-2 whitespace-nowrap">
                    Request clarification
                  </div>
                </button>
                <button 
                  onClick={() => handleActionClick('continue')}
                  className="bg-gray-700 text-gray-200 px-2.5 py-1 rounded-md text-sm hover:bg-gray-600 hover:text-white transition-colors duration-200 flex items-center space-x-1.5 relative group"
                  title="Continue the current conversation"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                  <span>Continue</span>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 mb-2 whitespace-nowrap">
                    Continue conversation
                  </div>
                </button>
              </div>
              <form onSubmit={handleFormSubmit} className="flex space-x-2">
                <Input
                  className="flex-1 bg-gray-800 text-white border-gray-700 focus:border-blue-400"
                  placeholder={`Ask me any question about ${currentExpert.toLowerCase()}! Just type or use the microphone.`}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                />
                 {/* Use SpeechToText component */}
                 <SpeechToText onTranscribe={handleTranscription} />
                <Button
                  type="submit"
                  size="icon"
                  className="bg-blue-600 text-white hover:bg-blue-700">
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </form>
              <p className="text-xs text-gray-500 mt-2 text-center">
                © 2024 AgentCoach.ai. All rights reserved.
              </p>
            </div>
          </div>
        </div>

    </div>
  );
}
