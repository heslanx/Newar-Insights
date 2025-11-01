import { List, useTable, DateField } from "@refinedev/antd";
import { Table, Space, Tag, Button } from "antd";
import { PlayCircleOutlined, StopOutlined, DownloadOutlined, EyeOutlined } from "@ant-design/icons";
import { useCustomMutation } from "@refinedev/core";

export const RecordingList = () => {
  const { tableProps } = useTable({
    syncWithLocation: true,
    pagination: {
      mode: "server",
      pageSize: 10,
    },
  });

  const { mutate: stopRecording } = useCustomMutation();

  const handleStop = (platform: string, meetingId: string) => {
    stopRecording({
      url: `http://localhost:8080/recordings/${platform}/${meetingId}`,
      method: "delete",
      values: {},
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      requested: "blue",
      joining: "cyan",
      active: "green",
      recording: "green",
      finalizing: "orange",
      completed: "success",
      failed: "error",
    };
    return colors[status] || "default";
  };

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column
          dataIndex="id"
          title="ID"
          width={80}
        />
        <Table.Column
          dataIndex="platform"
          title="Platform"
          render={(value) => (
            <Tag color="blue">{value === "google_meet" ? "Google Meet" : "Teams"}</Tag>
          )}
        />
        <Table.Column
          dataIndex="meeting_id"
          title="Meeting ID"
        />
        <Table.Column
          dataIndex="status"
          title="Status"
          render={(value) => (
            <Tag color={getStatusColor(value)}>{value.toUpperCase()}</Tag>
          )}
        />
        <Table.Column
          dataIndex="created_at"
          title="Created"
          render={(value) => <DateField value={value} format="DD/MM/YYYY HH:mm" />}
        />
        <Table.Column
          dataIndex="started_at"
          title="Started"
          render={(value) => value ? <DateField value={value} format="DD/MM/YYYY HH:mm" /> : "-"}
        />
        <Table.Column
          dataIndex="completed_at"
          title="Completed"
          render={(value) => value ? <DateField value={value} format="DD/MM/YYYY HH:mm" /> : "-"}
        />
        <Table.Column
          title="Actions"
          dataIndex="actions"
          render={(_, record: any) => (
            <Space>
              {(record.status === "recording" || record.status === "active") && (
                <Button
                  type="primary"
                  danger
                  size="small"
                  icon={<StopOutlined />}
                  onClick={() => handleStop(record.platform, record.meeting_id)}
                >
                  Stop
                </Button>
              )}
              {record.status === "completed" && record.recording_path && (
                <Button
                  type="default"
                  size="small"
                  icon={<DownloadOutlined />}
                  href={`http://localhost:8080/recordings/${record.platform}/${record.meeting_id}/download`}
                >
                  Download
                </Button>
              )}
              <Button
                type="default"
                size="small"
                icon={<EyeOutlined />}
                href={`/recordings/show/${record.platform}/${record.meeting_id}`}
              >
                View
              </Button>
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
