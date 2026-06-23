import React, { useState } from 'react';
import { Form, Input, Button, Card, Tabs, message, Typography } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

const { Title, Paragraph, Text } = Typography;

export default function Landing() {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      let response;
      if (activeTab === 'login') {
        response = await client.post('/auth/login', {
          email: values.email,
          password: values.password,
        });
        message.success('Welcome back to interview.ai!');
      } else {
        response = await client.post('/auth/signup', {
          email: values.email,
          password: values.password,
          name: values.name,
        });
        message.success('Account created successfully!');
      }

      const { access_token, user } = response.data;
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      navigate('/dashboard');
    } catch (error) {
      console.error(error);
      const errMsg = error.response?.data?.detail || 'Authentication failed. Please try again.';
      message.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row items-center justify-center p-6 md:p-12 relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />

      {/* Brand Section */}
      <div className="flex-1 max-w-xl md:pr-12 mb-12 md:mb-0 z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/25">
            <ThunderboltOutlined className="text-xl text-white font-bold" />
          </div>
          <span className="text-2xl font-extrabold bg-gradient-to-r from-violet-400 via-indigo-200 to-white bg-clip-text text-transparent tracking-tight">
            interview.ai
          </span>
        </div>
        
        <Title level={1} className="text-4xl md:text-5xl font-extrabold tracking-tight leading-none mb-6">
          <span className="text-white">Prepare for your dream role with </span>
          <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">Agentic Intelligence</span>
        </Title>
        
        <Paragraph className="text-slate-400 text-lg mb-8 leading-relaxed">
          Upload your resume, research company expectations, and simulate realistic technical and behavioral interviews. Receive a step-by-step preparation roadmap built by expert AI agents.
        </Paragraph>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { title: 'Resume Insight', desc: 'Identify skill and experience gaps instantly.' },
            { title: 'Targeted Research', desc: 'Simulate questions tailored to specific companies.' },
            { title: 'Interactive Practice', desc: 'Answer real questions under simulator constraints.' },
            { title: 'Actionable Roadmap', desc: 'Get a personalized timeline for skill improvement.' },
          ].map((feat, index) => (
            <div key={index} className="p-4 bg-slate-900/40 border border-slate-800/60 rounded-xl hover:border-violet-500/40 transition-colors">
              <h3 className="font-semibold text-white text-base mb-1">{feat.title}</h3>
              <p className="text-slate-400 text-sm">{feat.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Auth Widget Section */}
      <div className="w-full max-w-md z-10">
        <Card className="bg-slate-900/60 border border-slate-800 backdrop-blur-xl rounded-2xl shadow-2xl p-2">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            centered
            className="custom-tabs"
            items={[
              { key: 'login', label: <span className="text-slate-300 font-semibold px-2">Sign In</span> },
              { key: 'signup', label: <span className="text-slate-300 font-semibold px-2">Sign Up</span> },
            ]}
          />

          <Form
            name="auth_form"
            layout="vertical"
            initialValues={{ remember: true }}
            onFinish={onFinish}
            className="mt-6"
          >
            {activeTab === 'signup' && (
              <Form.Item
                name="name"
                rules={[{ required: true, message: 'Please enter your full name!' }]}
              >
                <Input
                  prefix={<UserOutlined className="text-slate-500" />}
                  placeholder="Full Name"
                  size="large"
                  className="bg-slate-950/80 border-slate-800 text-white placeholder-slate-500 hover:border-violet-500/50 focus:border-violet-500"
                />
              </Form.Item>
            )}

            <Form.Item
              name="email"
              rules={[
                { required: true, message: 'Please enter your email address!' },
                { type: 'email', message: 'Please enter a valid email address!' }
              ]}
            >
              <Input
                prefix={<MailOutlined className="text-slate-500" />}
                placeholder="Email Address"
                size="large"
                className="bg-slate-950/80 border-slate-800 text-white placeholder-slate-500 hover:border-violet-500/50 focus:border-violet-500"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Please enter your password!' }]}
            >
              <Input.Password
                prefix={<LockOutlined className="text-slate-500" />}
                placeholder="Password"
                size="large"
                className="bg-slate-950/80 border-slate-800 text-white placeholder-slate-500 hover:border-violet-500/50 focus:border-violet-500"
              />
            </Form.Item>

            <Form.Item className="mt-8 mb-0">
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                size="large"
                block
                className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 border-none h-11 text-white font-semibold rounded-xl shadow-lg shadow-violet-600/20"
              >
                {activeTab === 'login' ? 'Sign In' : 'Create Account'}
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  );
}
