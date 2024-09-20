"use client";

import axios from "axios";
import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { toast, ToastContainer } from 'react-toastify';
import genderNeutralAvatar from "@/components/avatar/gender neutral avatar.jpg";
import 'react-toastify/dist/ReactToastify.css';
import {
  ArrowRight,
  MessageCircle,
  Copy,
  ThumbsDown,
  ThumbsUp,
  Handshake,
  TrendingUp,
  Zap,
  LogOut,
  Settings,
  HelpCircle,
  BarChart,
  FileText,
  Target,
  Brain,
  Mic,
  Menu,
  Megaphone,
  Home,
  BookCheck,
  TargetIcon,
  Share,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, SignedIn, SignedOut, useClerk } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Image from "next/image";
import { v4 as uuidv4 } from "uuid";
import Link from "next/link";
import { format } from "date-fns";
import fs from "fs";
import ChatSidebar from "@/components/chatSideBar";
import HeaderBar from "@/components/header";
import TopicIntroduction from "@/components/topicIntroduction";
import SpeechToText from "@/components/speechToText";
import { useUser } from "@clerk/nextjs";

type Message = {
  role: "user" | "assistant" | "system";
  content: string;
  order: number;
  user_id: string;
  chat_id: string;
  message_id: string;
  like:number
};
type Props = {
  params: {
    chat_id: string;
  };
};

type ExpertType = 'General' | 'Real Estate' | 'Sales' | 'Marketing' | 'Negotiation' | 'Motivation';

function formatTables(content: string): string {
  // Check if the content is already in HTML format
  if (content.includes('<tr>') && content.includes('<td')) {
    const tableHtml = `
      <table class="border-collapse table-auto w-full text-sm my-4">
        <thead>
          <tr class="bg-gray-800">
            ${content.match(/<td[^>]*>(.*?)<\/td>/g)?.map(cell => 
              `<th class="border-b border-gray-700 font-medium p-4 pl-8 pt-0 pb-3 text-gray-300 text-left">${cell.replace(/<\/?td[^>]*>/g, '')}</th>`
            ).join('') || ''}
          </tr>
        </thead>
        <tbody class="bg-gray-700">
          ${content}
        </tbody>
      </table>
    `;
    return `<custom-table>${tableHtml}</custom-table>`;
  }

  // Original markdown table handling
  const tableRegex = /^\s*\|.*\|.*\n\s*\|.*\|.*\n(\s*\|.*\|.*\n)+/gm;
  return content.replace(tableRegex, (match) => {
    const rows = match.trim().split('\n');
    const headers = rows[0].split('|').filter(Boolean).map(h => h.trim());
    const alignments = rows[1].split('|').filter(Boolean).map(a => {
      if (a.startsWith(':') && a.endsWith(':')) return 'center';
      if (a.endsWith(':')) return 'right';
      return 'left';
    });
    const body = rows.slice(2).map(row => row.split('|').filter(Boolean).map(cell => cell.trim()));

    const tableHtml = `<table class="border-collapse table-auto w-full text-sm my-4">
      <thead>
        <tr class="bg-gray-800">
          ${headers.map((header, i) => `<th class="border-b border-gray-700 font-medium p-4 pl-8 pt-0 pb-3 text-gray-300 text-${alignments[i]} text-left">${header}</th>`).join('')}
        </tr>
      </thead>
      <tbody class="bg-gray-700">
        ${body.map(row => `
          <tr>
            ${row.map((cell, i) => `<td class="border-b border-gray-600 p-4 pl-8 text-gray-200 text-${alignments[i]}">${cell}</td>`).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>`;

    return `<custom-table>${tableHtml}</custom-table>`;
  });
}

function parseCustomTags(content: string): string {
  return content.replace(/<custom-table>([\s\S]*?)<\/custom-table>/g, (_, tableContent) => {
    return `<div class="my-4 overflow-x-auto">${tableContent}</div>`;
  });
}

export default function Page({ params: { chat_id } }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const newRouteRef = useRef('');
  const [currentExpert, setCurrentExpert] = useState<ExpertType>("General");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { userId } = useAuth();
  const router = useRouter();
  const { signOut } = useClerk();
  const supabaseUrl = "https://sgvvrdovhronhpykdgje.supabase.co";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || "";
  const supabase = createClient(supabaseUrl, supabaseKey);
  const searchParam = useSearchParams();
  const { user } = useUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress;
  const [placeholder, setPlaceholder] = useState(`Ask me any question about ${currentExpert.toLowerCase()}! Just type or use the microphone.`);
  const [firstMessageSent, setFirstMessageSent] = useState(false);

  useEffect(() => {
    if (Boolean(searchParam.get("new")) ) {
      if(newRouteRef.current) return;
      newRouteRef.current = "true";
      handleSendMessage(searchParam.get("ques") || "");
      router.replace(`/chat/${chat_id}`, undefined);
      return;
    }

    const fetchMessages = async () => {
      const { data: messages, error } = await supabase
        .from("message")
        .select()
        .eq("chat_id", chat_id)
        .eq("user_id", userId);

      if (messages) {
        const sortedMessages = messages.sort((a, b) => {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });
        
        setMessages(sortedMessages);
        // handleSendMessage(searchParam.get("ques") || "");jj
      }
    };

    if (userId && chat_id) {
      fetchMessages();
    }
  }, []);


  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (message: string) => {
    if(!isSidebarOpen) handleAskQuestion(message);
    if (isSending) return;
    setIsSending(true);
  
    if (message.trim()) {
      const prevOrder = messages.length > 0 ? messages[messages.length - 1].order : 0;
      const prevLength=messages.length; 

      const userMessage: Message = {
        role: "user",
        content: message,
        user_id: userId || "",
        order: prevOrder + 1,
        chat_id: chat_id,
        message_id: uuidv4(),
        like: 0,
      };
  
      // Insert user message into the database
      const { data: supabaseData, error: supabaseError } = await supabase
        .from("message")
        .insert([userMessage])
        .select();
  
      if (supabaseError) {
        console.error("Supabase error:", supabaseError);
        setIsSending(false);
        return;
      }
  
      setMessages((prev) => [...prev, userMessage]);
  
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages, userMessage],
            chatbot: currentExpert.toLowerCase(), 
            expert: currentExpert,
          }),
        });
  
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
  
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let done = false;
        
        const assistanceuuid=uuidv4();
        const assistantMessage: Message = { role: 'assistant', content: '',
          user_id: userId || "",
          order: prevOrder + 2,
          chat_id: chat_id,
          message_id: assistanceuuid,
          like: 0,
         };

        setMessages((prev) => [...prev, assistantMessage]);
  
        // Capture index for assistant message
        const assistantMessageIndex = prevLength+1;
        
        const newMessages = [...messages, userMessage, assistantMessage];
  
        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          const chunkValue = decoder.decode(value, { stream: true }); // Ensure streaming is handled correctly
  
          // Update assistant message content progressively
          newMessages[assistantMessageIndex].content += chunkValue;
          
          // Update the state with the progressively updated message
          setMessages([...newMessages]);
        }
  
        const systemMessage: Message = {
          role: "assistant",
          content: newMessages[assistantMessageIndex].content, // Use the final content from assistantMessage
          user_id: userId || "",
          order: prevOrder + 2,
          chat_id: chat_id,
          message_id: assistanceuuid,
          like: 0,
        };
  
        // Insert assistant message (system message) into the database
        const { data: systemSupabaseData, error: systemSupabaseError } = await supabase
          .from("message")
          .insert([systemMessage])
          .select();
  
        if (systemSupabaseError) {
          console.error("Error inserting system message into Supabase:", systemSupabaseError);
        }
  
        // Update state with the final assistant message
        // setMessages((prev) => [...prev, systemMessage]);
      } catch (error) {
        console.error("Error:", error);
        const errorMessage : Message={
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          user_id: userId || "",
          order: prevOrder + 2,
          chat_id: chat_id,
          message_id: uuidv4(),
          like: 0,
        };
        setMessages((prev) => [
          ...prev,
          errorMessage,
        ]);
        const { data: supabaseData, error: supabaseError } = await supabase
        .from("message")
        .insert([userMessage])
        .select();
      } finally {
        // Reset sending state
        setIsSending(false);
        setInputValue("");
        setPlaceholder(`Ask me any question about ${currentExpert.toLowerCase()}! Just type or use the microphone.`);
        setFirstMessageSent(true);
      }
    }
  };



  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputValue);
    setInputValue("");
  };

  const handleAskQuestion = async (message: string) => {
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

  const handleShare = async (content: string) => {
    try {
      // Format the content
      const formattedContent = formatEmailContent(content);

      const response = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: formattedContent }),
      });

      if (response.ok) {
        const { email } = await response.json();
        toast.success(`Message sent to your email: ${email}`, {
          position: "bottom-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
        });
      } else {
        throw new Error('Failed to send email');
      }
    } catch (error) {
      console.error('Error sharing message:', error);
      toast.error('Failed to send email. Please try again later.', {
        position: "bottom-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });
    }
  };

  const formatEmailContent = (content: string) => {
    // Split content into paragraphs
    const paragraphs = content.split('\n\n');

    // Format each paragraph
    const formattedParagraphs = paragraphs.map(paragraph => {
      // Check if it's a header (starts with **)
      if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
        return `<h2 style="color: #333; font-size: 20px; margin-top: 25px; margin-bottom: 15px; font-weight: bold;">${paragraph.replace(/\*\*/g, '')}</h2>`;
      }

      // Make text between ** bold
      paragraph = paragraph.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

      // Check if it's a list
      if (paragraph.includes('\n- ')) {
        const listItems = paragraph.split('\n- ').filter(item => item.trim());
        return `<ul style="margin-bottom: 20px; padding-left: 20px;">
          ${listItems.map(item => `<li style="margin-bottom: 10px; line-height: 1.6;">${item.trim()}</li>`).join('')}
        </ul>`;
      }

      // Check if it's a numbered list
      if (paragraph.match(/^\d+\./)) {
        const listItems = paragraph.split('\n').filter(item => item.trim());
        return `<ol style="margin-bottom: 20px; padding-left: 20px;">
          ${listItems.map(item => `<li style="margin-bottom: 10px; line-height: 1.6;">${item.replace(/^\d+\.\s*/, '')}</li>`).join('')}
        </ol>`;
      }

      // Regular paragraph
      return `<p style="margin-bottom: 15px; line-height: 1.6;">${paragraph}</p>`;
    });

    // Join all formatted paragraphs
    const formattedContent = formattedParagraphs.join('');

    // Wrap the content in a div with improved styling
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; color: #333; background-color: #f9f9f9; border-radius: 10px;">
        <h1 style="color: #2c3e50; font-size: 24px; margin-bottom: 20px; text-align: center;">Message from AgentCoach.ai</h1>
        ${formattedContent}
        <p style="font-size: 12px; color: #777; text-align: center; margin-top: 30px;">© 2024 AgentCoach.ai. All rights reserved.</p>
      </div>
    `;
  };

  const getAIAvatar = (expert: ExpertType) => {
    let IconComponent;
    switch (expert) {
      case 'General':
        return (
          <AvatarImage
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/2%20copy-FNVfXcGRjKO97dR4JbmOnzv21Ov8LM.png"
            alt="AI"
          />
        );
      case 'Real Estate':
        IconComponent = Home;
        break;
      case 'Negotiation':
        IconComponent = Handshake;
        break;
      case 'Sales':
        IconComponent = TrendingUp;
        break;
      case 'Motivation':
        IconComponent = Zap;
        break;
      case 'Marketing':
        IconComponent = Megaphone;
        break;
      default:
        IconComponent = Brain;
    }
    return (
      <div className="w-full h-full rounded-full border-2 border-blue-400 flex items-center justify-center bg-gray-800">
        <IconComponent className="w-5 h-5 text-blue-400" />
      </div>
    );
  };

  const handleLike = async (messageId: string, likeValue: number) => {
    setMessages((prevMessages) =>
      prevMessages.map((msg) =>
        msg.message_id === messageId ? { ...msg, like: likeValue } : msg
      )
    );
    
    if (likeValue === 1) {
      toast.success('Message liked successfully', {
        position: "bottom-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });
    } else if (likeValue === -1) {
      toast.error('Message disliked', {
        position: "bottom-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });
    }
    // Update the 'like' field in the databased
    const { data, error } = await supabase
      .from("message")
      .update({ like: likeValue })
      .eq("message_id", messageId).select();
    if (error) {
      console.error("Error updating like value:", error);
    }
  };

  const handleCopyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      toast.info('Message copied to clipboard', {
        position: "bottom-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });
    }).catch((err) => {
      console.error('Failed to copy: ', err);
      toast.error('Failed to copy to clipboard', {
        position: "bottom-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });
    });
  };

  const handleExpertClick = (expert: ExpertType) => {
    setCurrentExpert(expert);
    setMessages([]);
    setIsSidebarOpen(false);
  };
  
  const handleTranscription = (transcribedText: string) => {
    setInputValue((prev) => `${prev} ${transcribedText}`);
  };

  const handleActionClick = (action: string) => {
    let message = '';
    switch (action) {
      case 'examples':
        message = 'Can you give me some examples?';
        break;
      case 'specific':
        message = 'Can you be more specific?';
        break;
      case 'understand':
        message = "I don&apos;t understand. Can you explain further?";
        break;
      case 'continue':
        message = "Continue with the conversation.";
        break;
    }
    handleSendMessage(message);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      <SignedIn>
      
         {/* Header */}
         <HeaderBar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} signOut={signOut}/>
        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden pt-16">
          {" "}
          {/* Added pt-16 for header height */}

          <ChatSidebar userId={userId} supabase={supabase} isSidebarOpen={isSidebarOpen} handleExpertClick={handleExpertClick} />
          {/* Main Chat Area */}
         
          <div className="flex-1 flex flex-col bg-gray-900 overflow-hidden">
            <ScrollArea className="flex-1">
              
              <div className="p-4 space-y-4 min-h-[calc(100vh-12rem)]">
              {messages.length === 0 ? (
                  <div className="pt-8">
                    <TopicIntroduction
                      topic={currentExpert}
                      onAskQuestion={handleAskQuestion}
                    />
                  </div>
                ) : (
                messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex items-start space-x-4 ${
                      message.role === "user"
                        ? "flex-row-reverse space-x-reverse"
                        : ""
                    }`}>
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      {message.role === "user" ? (
                        <AvatarImage
                          src="https://static.vecteezy.com/system/resources/previews/005/129/844/non_2x/profile-user-icon-isolated-on-white-background-eps10-free-vector.jpg"
                          alt="User"
                          className="object-cover"
                        />
                      ) : (
                        getAIAvatar(currentExpert)
                      )}
                    </Avatar>
                    <div className="space-y-2 max-w-[70%] md:max-w-[80%]">
                      <div
                        className={`p-3 rounded-lg ${
                          message.role === "user"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-800 text-gray-300"
                        }`}>
                        <ReactMarkdown
                          components={{
                            p: ({ node, ...props }) => <p className="mb-2" {...props} />,
                            ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2" {...props} />,
                            ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-2" {...props} />,
                            li: ({ node, ...props }) => node && <li className="mb-1" {...props} />,
                            strong: ({ node, ...props }) => node && <strong className="font-bold" {...props} />,
                            table: ({ node, ...props }) => (
                              <div className="my-4 overflow-x-auto" dangerouslySetInnerHTML={{ __html: props.children?.toString() || '' }} />
                            ),
                          }}
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeRaw]}
                        >
                          {parseCustomTags(formatTables(message.content))}
                        </ReactMarkdown>
                      </div>
                      {message.role === "assistant" && (
                        <div className="flex space-x-2">
                          <div className="relative group">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleLike(message.message_id, 1)}
                              className={`${
                                message.like === 1
                                  ? "text-blue-400"
                                  : "text-gray-400 hover:text-white hover:bg-gray-800"
                              }`}
                            >
                              <ThumbsUp className="h-4 w-4" />
                            </Button>
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 mb-2 whitespace-nowrap">
                              Like this response
                            </div>
                          </div>
                          <div className="relative group">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleLike(message.message_id, -1)}
                              className={`${
                                message.like === -1
                                  ? "text-red-400"
                                  : "text-gray-400 hover:text-white hover:bg-gray-800"
                              }`}
                            >
                              <ThumbsDown className="h-4 w-4" />
                            </Button>
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 mb-2 whitespace-nowrap">
                              Dislike this response
                            </div>
                          </div>
                          <div className="relative group">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCopyToClipboard(message.content)}
                              className="text-gray-400 hover:text-white hover:bg-gray-800"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 mb-2 whitespace-nowrap">
                              Copy to clipboard
                            </div>
                          </div>
                          <div className="relative group">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleShare(message.content)}
                              className="text-gray-400 hover:text-white hover:bg-gray-800"
                            >
                              <Share className="h-4 w-4" />
                            </Button>
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 mb-2 whitespace-nowrap">
                              Send this response to your email
                            </div>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                ))
                )}

                <div ref={chatEndRef} />
              </div>
            </ScrollArea>
            <div className="border-t border-gray-700 p-4">
              {messages.length > 0 && (
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
              )}
              <form onSubmit={handleFormSubmit} className="flex space-x-2">
                <Input
                  className="flex-1 bg-gray-800 text-white border-gray-700 focus:border-blue-400"
                  placeholder={placeholder}
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
      </SignedIn>
      <ToastContainer />
    </div>
  );
}
