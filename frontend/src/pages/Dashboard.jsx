import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Tag, Modal, List, Badge, message } from 'antd';
import { PlayCircleOutlined, LogoutOutlined, PlusOutlined, FileTextOutlined, HistoryOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import ResumeUpload from '../components/ResumeUpload';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [resume, setResume] = useState(null);
  const [interviews, setInterviews] = useState([]);
  const [loadingInterviews, setLoadingInterviews] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();
  const [form] = Form.useForm();

  useEffect(() => {
    // 1. Get user details from localStorage
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      navigate('/');
      return;
    }
    setUser(JSON.parse(storedUser));

    // 2. Fetch user's active resume & past interviews
    fetchDashboardData();
  }, [navigate]);

  const fetchDashboardData = async () => {
    setLoadingInterviews(true);
    try {
      // In a real app we'd fetch the user's latest resume and their interviews list.
      // Since we don't have separate GET resumes/interviews list endpoints yet, 
      // let's fetch any resume details from localStorage or use a state sync if they uploaded.
      const storedResume = localStorage.getItem('active_resume');
      if (storedResume) {
        setResume(JSON.parse(storedResume));
      }
      
      // Let's call /me or a similar endpoint to test server connection.
      await client.get('/auth/me');
      
      // For past interviews, we can store them in localStorage or query. Since we only have /interview/{id}
      // let's pull past interviews list from local storage sync so they show up for the user locally.
      const storedInterviews = localStorage.getItem('interviews_list');
      if (storedInterviews) {
        setInterviews(JSON.parse(storedInterviews));
      }
    } catch (error) {
      console.error(error);
      message.error('Failed to sync database state.');
    } finally {
      setLoadingInterviews(false);
    }
  };

  const handleResumeUpload = (resumeData) => {
    setResume(resumeData);
    localStorage.setItem('active_resume', JSON.stringify(resumeData));
  };

  const handleCreateInterview = async (values) => {
    setCreateLoading(true);
    try {
      const response = await client.post('/interview/create', {
        company: values.company,
        role: values.role,
        job_description: values.job_description || '',
        resume_id: resume ? resume.id : null,
      });

      const newInterview = response.data;
      
      // Save locally to show in dashboard list
      const updatedList = [newInterview, ...interviews];
      setInterviews(updatedList);
      localStorage.setItem('interviews_list', JSON.stringify(updatedList));

      message.success('Simulated interview session initialized!');
      setIsModalOpen(false);
      form.resetFields();
      
      // Navigate to the interview room
      navigate(`/interview/${newInterview.id}`);
    } catch (error) {
      console.error(error);
      const errMsg = error.response?.data?.detail || 'Failed to initialize interview.';
      message.error(errMsg);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('active_resume');
    localStorage.removeItem('interviews_list');
    message.success('Logged out successfully.');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 relative overflow-hidden">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-violet-600/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-indigo-600/5 blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-8 z-10 relative">
        <div>
          <span className="text-violet-400 font-semibold tracking-wide text-xs uppercase">Candidate Center</span>
          <h1 className="text-3xl font-extrabold text-white mt-1">
            Welcome back, {user?.name || 'Developer'}
          </h1>
        </div>
        <Button
          type="text"
          icon={<LogoutOutlined />}
          onClick={handleLogout}
          className="text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/30 h-10 px-4 rounded-xl flex items-center gap-1"
        >
          Sign Out
        </Button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12 z-10 relative">
        {/* Left Column: Create / Active Status */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          <Card className="bg-gradient-to-br from-slate-900 to-slate-950 border-slate-800 rounded-2xl shadow-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-white">Interview Intelligence</h2>
                <p className="text-slate-400 text-sm mt-1">Configure your role preferences to start a customized preparation simulation.</p>
              </div>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setIsModalOpen(true)}
                className="bg-violet-600 hover:bg-violet-500 border-none h-10 rounded-xl px-4 font-semibold shadow-lg shadow-violet-500/20"
              >
                New Interview
              </Button>
            </div>
            
            <div className="border border-slate-800/80 bg-slate-950/40 rounded-xl p-8 text-center flex flex-col items-center justify-center min-h-[220px]">
              <PlayCircleOutlined className="text-violet-500 text-5xl mb-4 opacity-80" />
              <h3 className="text-slate-200 font-semibold text-lg mb-1">Ready to simulate an interview?</h3>
              <p className="text-slate-400 text-sm max-w-md mb-6">
                Prepare for coding evaluations, scalability reviews, or behavioral matching. Our AI agents will tailor each session to your profile.
              </p>
              <Button
                onClick={() => setIsModalOpen(true)}
                className="bg-slate-900 text-violet-400 hover:text-white border-slate-800 hover:border-violet-500/50 hover:bg-violet-600/10 px-6 h-10 rounded-xl font-semibold"
              >
                Configure Session
              </Button>
            </div>
          </Card>

          {/* Past Interviews List */}
          <Card className="bg-slate-900/60 border-slate-800 rounded-2xl shadow-xl p-4">
            <div className="flex items-center gap-2 mb-6">
              <HistoryOutlined className="text-violet-400 text-lg" />
              <h2 className="text-xl font-bold text-white">Practice History</h2>
            </div>

            <List
              loading={loadingInterviews}
              dataSource={interviews}
              locale={{ emptyText: <span className="text-slate-500 text-sm">No interviews practiced yet.</span> }}
              renderItem={(item) => (
                <List.Item
                  key={item.id}
                  className="border-b border-slate-800/50 hover:bg-slate-900/40 px-4 py-4 rounded-xl transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2"
                  onClick={() => navigate(item.status === 'completed' ? `/report/${item.id}` : `/interview/${item.id}`)}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-slate-800 border border-slate-700/60 rounded-xl flex items-center justify-center text-slate-300 font-bold text-base">
                      {item.company.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-white font-semibold text-base leading-tight">{item.role}</h4>
                      <p className="text-slate-400 text-sm mt-1">{item.company}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge
                      status={item.status === 'completed' ? 'success' : 'processing'}
                      text={<span className="text-slate-300 text-sm capitalize">{item.status.replace('_', ' ')}</span>}
                    />
                    <Button 
                      type="link" 
                      className="text-violet-400 hover:text-violet-300 font-semibold p-0 text-sm"
                    >
                      {item.status === 'completed' ? 'View Scorecard' : 'Resume practice'}
                    </Button>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </div>

        {/* Right Column: Resume & Skills Analysis */}
        <div className="flex flex-col gap-8">
          {!resume ? (
            <ResumeUpload onUploadSuccess={handleResumeUpload} />
          ) : (
            <Card className="bg-slate-900/60 border-slate-800 rounded-2xl shadow-xl p-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
                <div className="flex items-center gap-2">
                  <FileTextOutlined className="text-violet-400 text-lg" />
                  <h3 className="font-bold text-white text-base">Parsed Profile</h3>
                </div>
                <Button
                  type="link"
                  onClick={() => {
                    localStorage.removeItem('active_resume');
                    setResume(null);
                  }}
                  className="text-rose-400 hover:text-rose-300 p-0 text-xs"
                >
                  Remove
                </Button>
              </div>

              {/* Skills Tags */}
              <div className="mb-6">
                <h4 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Identified Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {resume.skills?.skills?.map((skill, idx) => (
                    <Tag key={idx} className="bg-violet-950/40 border-violet-800/40 text-violet-300 px-2 py-0.5 rounded-md font-medium text-xs">
                      {skill}
                    </Tag>
                  ))}
                  {(!resume.skills?.skills || resume.skills.skills.length === 0) && (
                    <span className="text-slate-500 text-sm">No skills identified.</span>
                  )}
                </div>
              </div>

              {/* Profile Gaps */}
              <div>
                <h4 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Target Improvement Areas</h4>
                <ul className="space-y-2.5">
                  {resume.skills?.gaps?.map((gap, idx) => (
                    <li key={idx} className="text-slate-300 text-sm flex items-start gap-2 leading-relaxed">
                      <span className="text-violet-500 font-bold mt-0.5">•</span>
                      <span>{gap}</span>
                    </li>
                  ))}
                  {(!resume.skills?.gaps || resume.skills.gaps.length === 0) && (
                    <span className="text-slate-500 text-sm">No gap data.</span>
                  )}
                </ul>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Create Interview Modal */}
      <Modal
        title={<span className="text-white text-xl font-bold">Configure Interview Simulation</span>}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        className="dark-modal"
        centered
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateInterview}
          className="mt-6"
        >
          <Form.Item
            name="company"
            label={<span className="text-slate-300 text-sm">Target Company</span>}
            rules={[{ required: true, message: 'Please input the company name (e.g. Google, Stripe)!' }]}
          >
            <Input 
              placeholder="e.g. Google" 
              className="bg-slate-950 border-slate-800 text-white placeholder-slate-500 hover:border-violet-500/50 focus:border-violet-500"
            />
          </Form.Item>

          <Form.Item
            name="role"
            label={<span className="text-slate-300 text-sm">Job Role / Title</span>}
            rules={[{ required: true, message: 'Please input the job title!' }]}
          >
            <Input 
              placeholder="e.g. Senior Backend Engineer" 
              className="bg-slate-950 border-slate-800 text-white placeholder-slate-500 hover:border-violet-500/50 focus:border-violet-500"
            />
          </Form.Item>

          <Form.Item
            name="job_description"
            label={<span className="text-slate-300 text-sm">Job Description (Optional)</span>}
          >
            <Input.TextArea 
              rows={4} 
              placeholder="Paste the job description here to align agent questioning with key job requirements..."
              className="bg-slate-950 border-slate-800 text-white placeholder-slate-500 hover:border-violet-500/50 focus:border-violet-500"
            />
          </Form.Item>

          {resume ? (
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl mb-6 flex items-center justify-between">
              <span className="text-slate-300 text-xs">Attached resume: <strong>Parsed Profile</strong></span>
              <Badge status="success" text={<span className="text-emerald-400 text-xs">Linked</span>} />
            </div>
          ) : (
            <div className="p-3 bg-slate-900/40 border border-slate-800/80 rounded-xl mb-6 text-center">
              <span className="text-slate-400 text-xs">No resume attached. Questions will be generated generally for the role.</span>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-8">
            <Button 
              onClick={() => setIsModalOpen(false)}
              className="bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={createLoading}
              className="bg-violet-600 hover:bg-violet-500 border-none px-6 font-semibold"
            >
              Launch Simulation
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
