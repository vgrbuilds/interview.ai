import React, { useState, useEffect, useRef } from 'react';
import { Input, Button, Space, message, Tooltip, Switch } from 'antd';
import { 
  SendOutlined, 
  LoadingOutlined, 
  CheckCircleOutlined, 
  InfoCircleOutlined,
  AudioOutlined,
  AudioMutedOutlined,
  SoundOutlined,
  StopOutlined
} from '@ant-design/icons';

const { TextArea } = Input;

export default function InterviewChat({ questions, currentQuestion, onAnswerSubmit, submitting }) {
  const [answerText, setAnswerText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const recognitionRef = useRef(null);
  const utteranceRef = useRef(null);

  // Auto-speak new question when it changes (if enabled)
  useEffect(() => {
    if (currentQuestion && autoSpeak) {
      speakText(currentQuestion.question);
    }
    // Cancel speech when question changes or user leaves
    return () => {
      cancelSpeech();
    };
  }, [currentQuestion, autoSpeak]);

  // Clean up speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const handleSubmit = () => {
    if (!answerText.trim()) return;
    
    // Stop listening if active before submitting
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    // Stop speaking if active
    cancelSpeech();

    onAnswerSubmit(answerText);
    setAnswerText('');
  };

  // Text to Speech (TTS)
  const speakText = (text) => {
    if (!('speechSynthesis' in window)) {
      message.warning('Text-to-Speech is not supported in this browser.');
      return;
    }

    cancelSpeech();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95; // Slightly slower for clear interview articulation
    utterance.pitch = 1.0;
    
    // Attempt to select an English female/male voice if available
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(voice => voice.lang.startsWith('en'));
    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const cancelSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Speech to Text (STT)
  const toggleListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      message.error('Speech Recognition (STT) is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    // Cancel speech if interviewer is speaking before user starts answering
    cancelSpeech();

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        message.info('Microphone active. Start speaking...');
      };

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');
        
        setAnswerText(prev => prev + (prev ? ' ' : '') + transcript);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          message.error(`Speech recognition error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  };

  const answeredQuestions = questions.filter(q => q.answer !== null);

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Active Question Banner */}
      {currentQuestion ? (
        <div className="p-5 bg-violet-950/20 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded">
                Question {answeredQuestions.length + 1} of {questions.length}
              </span>
              <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                currentQuestion.difficulty === 'easy' ? 'bg-emerald-500/20 text-emerald-300' :
                currentQuestion.difficulty === 'medium' ? 'bg-amber-500/20 text-amber-300' :
                'bg-rose-500/20 text-rose-300'
              }`}>
                {currentQuestion.difficulty}
              </span>
            </div>
            <p className="text-white text-base font-semibold leading-relaxed">
              {currentQuestion.question}
            </p>
          </div>
          
          {/* TTS Speech Controls */}
          <div className="flex items-center gap-2.5 sm:self-center shrink-0">
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-slate-500 mb-1">Auto-Speak</span>
              <Switch 
                size="small" 
                checked={autoSpeak} 
                onChange={(checked) => setAutoSpeak(checked)}
                className="bg-slate-700"
              />
            </div>
            <Tooltip title={isSpeaking ? "Stop Speaking" : "Speak Question"}>
              <Button
                shape="circle"
                icon={isSpeaking ? <StopOutlined /> : <SoundOutlined />}
                onClick={isSpeaking ? cancelSpeech : () => speakText(currentQuestion.question)}
                className={`border-slate-800 ${
                  isSpeaking 
                    ? 'bg-rose-600/20 text-rose-400 hover:bg-rose-600/30' 
                    : 'bg-slate-950 text-slate-300 hover:text-violet-400 hover:border-violet-500/40'
                }`}
              />
            </Tooltip>
          </div>
        </div>
      ) : (
        <div className="p-5 bg-emerald-950/20 border-b border-slate-800/80 text-center">
          <p className="text-emerald-400 font-semibold flex items-center justify-center gap-2">
            <CheckCircleOutlined /> Simulation Completed! Compiling feedback report...
          </p>
        </div>
      )}

      {/* Answer History / Conversational Feed */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-[300px] max-h-[420px] scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {answeredQuestions.length === 0 && (
          <div className="text-center py-12">
            <InfoCircleOutlined className="text-slate-600 text-3xl mb-3" />
            <p className="text-slate-400 text-sm max-w-xs mx-auto">
              No answers submitted yet. Read the active question above, toggle the microphone to dictate your response, or type directly.
            </p>
          </div>
        )}
        
        {answeredQuestions.map((q, index) => (
          <div key={q.id || index} className="space-y-3">
            {/* Question Text */}
            <div className="flex justify-start">
              <div className="max-w-[85%] bg-slate-950/60 border border-slate-800/80 text-slate-300 text-sm p-4 rounded-2xl rounded-tl-none">
                <span className="text-xs font-bold text-violet-400 block mb-1">Interviewer Question {index + 1}</span>
                {q.question}
              </div>
            </div>
            
            {/* Candidate Answer */}
            <div className="flex justify-end">
              <div className="max-w-[85%] bg-violet-600 text-white text-sm p-4 rounded-2xl rounded-tr-none shadow-md">
                <span className="text-xs font-semibold text-violet-200 block mb-1">Your Response</span>
                {q.answer}
              </div>
            </div>

            {/* AI Grading Feedback */}
            {q.feedback && (
              <div className="flex justify-start pl-6 border-l-2 border-slate-850">
                <div className="max-w-[90%] text-xs text-slate-400 p-2.5 bg-slate-950/30 rounded-lg">
                  <span className="font-bold text-slate-300 block mb-1">
                    Evaluation Score: <span className={q.score >= 7 ? 'text-emerald-400' : q.score >= 4 ? 'text-amber-400' : 'text-rose-400'}>{q.score}/10</span>
                  </span>
                  {q.feedback}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input Tray */}
      {currentQuestion && (
        <div className="p-4 bg-slate-950 border-t border-slate-800/80">
          <div className="flex gap-2">
            {/* STT Microphone Dictation Button */}
            <Tooltip title={isListening ? "Listening... Click to stop" : "Use Voice Dictation"}>
              <Button
                type="default"
                size="large"
                shape="circle"
                onClick={toggleListening}
                disabled={submitting}
                icon={isListening ? <AudioOutlined className="animate-pulse" /> : <AudioMutedOutlined />}
                className={`h-11 w-11 flex items-center justify-center shrink-0 border-slate-800 ${
                  isListening 
                    ? 'bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-500/20' 
                    : 'bg-slate-900 text-slate-300 hover:text-violet-400 hover:border-violet-500/40'
                }`}
              />
            </Tooltip>

            {/* Answer Input and Submit Button */}
            <Space.Compact className="w-full" size="large">
              <TextArea
                rows={2}
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder={isListening ? "Listening to your voice..." : "Type your response here... (mention technologies, trade-offs, and past experience)"}
                disabled={submitting}
                className="bg-slate-900 border-slate-800 text-white placeholder-slate-500 hover:border-violet-500/50 focus:border-violet-500 resize-none py-2 rounded-l-xl"
                onPressEnter={(e) => {
                  if (!e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />
              <Button
                type="primary"
                icon={submitting ? <LoadingOutlined /> : <SendOutlined />}
                onClick={handleSubmit}
                disabled={submitting || !answerText.trim()}
                className="bg-violet-600 hover:bg-violet-500 border-none h-auto px-6 rounded-r-xl text-white font-semibold flex items-center justify-center"
              >
                {submitting ? 'Evaluating' : 'Submit'}
              </Button>
            </Space.Compact>
          </div>
          
          <div className="flex justify-between items-center mt-2 px-1">
            <span className="text-slate-500 text-[10px]">
              {isListening ? 'Voice activation is active' : 'Press Enter to submit, Shift+Enter for newline'}
            </span>
            {submitting && (
              <span className="text-violet-400 text-[10px] animate-pulse">AI Agent is grading your answer...</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
