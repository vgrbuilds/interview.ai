import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Spin, Timeline, Tag, message } from 'antd';
import { LeftOutlined, BookOutlined, CheckCircleOutlined, CompassOutlined } from '@ant-design/icons';
import client from '../api/client';
import ScoreCard from '../components/ScoreCard';

export default function Report() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [interview, setInterview] = useState(null);

  useEffect(() => {
    fetchReportDetails();
  }, [id]);

  const fetchReportDetails = async () => {
    setLoading(true);
    try {
      // 1. Fetch interview general details to display role / company context
      const interviewRes = await client.get(`/interview/${id}`);
      setInterview(interviewRes.data);

      // 2. Fetch feedback scorecard and roadmap
      const reportRes = await client.get(`/interview/${id}/report`);
      setReport(reportRes.data);
    } catch (error) {
      console.error(error);
      message.error('Failed to retrieve feedback report details.');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Spin size="large" tip={<span className="text-violet-400 mt-2 font-medium">Assembling scorecard & roadmap...</span>} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 relative overflow-hidden">
      {/* Background glow decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[350px] h-[350px] rounded-full bg-violet-600/5 blur-[90px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-6 mb-8 z-10 relative">
        <div className="flex items-center gap-3">
          <Button
            type="text"
            icon={<LeftOutlined />}
            onClick={() => navigate('/dashboard')}
            className="text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 h-9 px-3 rounded-lg flex items-center"
          >
            Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white leading-tight">Performance Scorecard</h1>
            <p className="text-slate-400 text-xs mt-1">{interview?.role} at {interview?.company}</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 justify-end">
            <CheckCircleOutlined /> Completed
          </span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 z-10 relative">
        {/* Scorecard Display (Left span 2) */}
        <div className="lg:col-span-2 space-y-8">
          <ScoreCard
            technicalScore={report?.technical_score || 0}
            communicationScore={report?.communication_score || 0}
            strengths={report?.strengths || []}
            weaknesses={report?.weaknesses || []}
          />
        </div>

        {/* Roadmap Display (Right span 1) */}
        <div>
          <Card className="bg-slate-900/60 border-slate-800 rounded-2xl shadow-xl p-4 h-full">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <CompassOutlined className="text-violet-400" /> Career Roadmap
            </h3>

            {(!report?.roadmap || report.roadmap.length === 0) ? (
              <p className="text-slate-500 text-xs">No roadmap steps compiled.</p>
            ) : (
              <Timeline
                mode="left"
                className="custom-timeline"
                items={report.roadmap.map((step) => ({
                  color: '#8b5cf6',
                  dot: <div className="w-5 h-5 bg-violet-600 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-slate-900">{step.step}</div>,
                  children: (
                    <div className="pb-6 pl-2">
                      <h4 className="text-white font-semibold text-sm leading-tight mb-2">{step.topic}</h4>
                      
                      {/* Action items */}
                      <div className="mb-3 space-y-1.5">
                        {step.actions?.map((act, i) => (
                          <div key={i} className="text-slate-300 text-xs flex items-start gap-1.5 leading-relaxed">
                            <span className="text-violet-400 mt-0.5">•</span>
                            <span>{act}</span>
                          </div>
                        ))}
                      </div>

                      {/* Resources */}
                      {step.resources && step.resources.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {step.resources.map((res, i) => (
                            <Tag 
                              key={i} 
                              icon={<BookOutlined />} 
                              className="bg-slate-950/80 border-slate-800/80 text-slate-400 px-2 py-0.5 rounded text-[10px] font-medium"
                            >
                              {res}
                            </Tag>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                }))}
              />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
