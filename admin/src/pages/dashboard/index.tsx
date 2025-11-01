import { Card, Col, Row, Statistic } from "antd";
import {
  VideoCameraOutlined,
  RobotOutlined,
  UserOutlined,
  ClockCircleOutlined
} from "@ant-design/icons";

export const Dashboard = () => {
  return (
    <div style={{ padding: "24px" }}>
      <h1>Newar Admin Dashboard</h1>
      <p style={{ marginBottom: "24px", color: "#666" }}>
        Meeting Recordings Management System
      </p>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Recordings"
              value={6}
              prefix={<VideoCameraOutlined />}
              valueStyle={{ color: "#3f8600" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Active Bots"
              value={1}
              prefix={<RobotOutlined />}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Users"
              value={1}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Avg Duration"
              value={"-"}
              suffix="min"
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: "24px" }}>
        <Col xs={24} lg={16}>
          <Card title="Quick Start Guide" style={{ height: "100%" }}>
            <ol>
              <li>
                <strong>Create a Recording:</strong> Go to Recordings → Create and enter a Google Meet URL
              </li>
              <li>
                <strong>Monitor Status:</strong> Watch the bot join the meeting and start recording
              </li>
              <li>
                <strong>Download:</strong> Once completed, download the recording from the list
              </li>
              <li>
                <strong>Manage Users:</strong> Create users and generate API keys
              </li>
            </ol>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="System Status" style={{ height: "100%" }}>
            <div style={{ marginBottom: "12px" }}>
              <strong>API Gateway:</strong> <span style={{ color: "green" }}>✓ Healthy</span>
            </div>
            <div style={{ marginBottom: "12px" }}>
              <strong>Bot Manager:</strong> <span style={{ color: "green" }}>✓ Healthy</span>
            </div>
            <div style={{ marginBottom: "12px" }}>
              <strong>Database:</strong> <span style={{ color: "green" }}>✓ Connected (Supabase)</span>
            </div>
            <div>
              <strong>Redis:</strong> <span style={{ color: "green" }}>✓ Connected</span>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};
