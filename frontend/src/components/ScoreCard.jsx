import React from 'react';
import { Card, Progress, Row, Col, Space } from 'antd';
import { CheckOutlined, CloseOutlined, TrophyOutlined } from '@ant-design/icons';

export default function ScoreCard({ technicalScore, communicationScore, strengths = [], weaknesses = [] }) {
  const averageScore = ((technicalScore + communicationScore) / 2).toFixed(1);

  return (
    <div className="space-y-8">
      {/* Overall Score Dial */}
      <Card className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border-slate-800 rounded-2xl shadow-xl p-4">
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} md={10} className="flex flex-col items-center justify-center text-center">
            <div className="relative flex items-center justify-center">
              <Progress
                type="circle"
                percent={averageScore * 10}
                format={() => (
                  <div className="text-center">
                    <span className="text-3xl font-extrabold text-white">{averageScore}</span>
                    <span className="text-slate-500 text-xs block">out of 10</span>
                  </div>
                )}
                strokeWidth={10}
                strokeColor={{
                  '0%': '#8b5cf6',
                  '100%': '#6366f1',
                }}
                trailColor="#1e293b"
                width={160}
              />
            </div>
            <h3 className="text-white font-bold text-lg mt-4 flex items-center gap-1.5 justify-center">
              <TrophyOutlined className="text-amber-400" /> Overall Assessment
            </h3>
            <p className="text-slate-400 text-xs mt-1">Weighted average of your simulation responses.</p>
          </Col>

          <Col xs={24} md={14}>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm font-semibold text-slate-300 mb-1.5">
                  <span>Technical Score</span>
                  <span className="text-violet-400 font-bold">{technicalScore} / 10</span>
                </div>
                <Progress 
                  percent={technicalScore * 10} 
                  showInfo={false}
                  strokeColor="#8b5cf6" 
                  trailColor="#1e293b"
                  strokeWidth={8}
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Measures API logic, system scale knowledge, and syntax accuracy.</span>
              </div>

              <div>
                <div className="flex justify-between text-sm font-semibold text-slate-300 mb-1.5">
                  <span>Communication Score</span>
                  <span className="text-indigo-400 font-bold">{communicationScore} / 10</span>
                </div>
                <Progress 
                  percent={communicationScore * 10} 
                  showInfo={false}
                  strokeColor="#6366f1" 
                  trailColor="#1e293b"
                  strokeWidth={8}
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Measures structure clarity, STAR formulation, and problem articulation.</span>
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Strengths and Weaknesses Grid */}
      <Row gutter={[24, 24]}>
        <Col xs={24} md={12}>
          <Card className="bg-slate-900/60 border-slate-800 rounded-2xl shadow-xl h-full p-4">
            <h3 className="text-emerald-400 font-bold text-base mb-4 flex items-center gap-2">
              <CheckOutlined className="bg-emerald-500/10 p-1 rounded-full text-xs" /> Demoed Strengths
            </h3>
            {strengths.length === 0 ? (
              <p className="text-slate-500 text-xs">No specific strengths annotated.</p>
            ) : (
              <ul className="space-y-3.5">
                {strengths.map((str, idx) => (
                  <li key={idx} className="text-slate-300 text-sm flex items-start gap-2.5 leading-relaxed">
                    <span className="text-emerald-500 mt-0.5">•</span>
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card className="bg-slate-900/60 border-slate-800 rounded-2xl shadow-xl h-full p-4">
            <h3 className="text-rose-400 font-bold text-base mb-4 flex items-center gap-2">
              <CloseOutlined className="bg-rose-500/10 p-1 rounded-full text-xs" /> Growth Opportunities
            </h3>
            {weaknesses.length === 0 ? (
              <p className="text-slate-500 text-xs">No specific weaknesses annotated.</p>
            ) : (
              <ul className="space-y-3.5">
                {weaknesses.map((weak, idx) => (
                  <li key={idx} className="text-slate-300 text-sm flex items-start gap-2.5 leading-relaxed">
                    <span className="text-rose-500 mt-0.5">•</span>
                    <span>{weak}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
