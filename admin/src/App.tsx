import { Refine } from "@refinedev/core";
import {
  notificationProvider,
  ThemedLayoutV2,
  ErrorComponent,
  RefineThemes,
} from "@refinedev/antd";
import "@refinedev/antd/dist/reset.css";

import routerBindings, {
  DocumentTitleHandler,
  UnsavedChangesNotifier,
} from "@refinedev/react-router-v6";
import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import { ConfigProvider } from "antd";
import {
  VideoCameraOutlined,
  RobotOutlined,
  UserOutlined,
  DashboardOutlined,
} from "@ant-design/icons";

import { dataProvider } from "./providers/dataProvider";
import { authProvider } from "./providers/authProvider";

// Pages
import { Dashboard } from "./pages/dashboard";
import { RecordingList } from "./pages/recordings/list";
import { RecordingCreate } from "./pages/recordings/create";
import { Login } from "./pages/login";

function App() {
  return (
    <BrowserRouter>
      <ConfigProvider theme={RefineThemes.Blue}>
          <Refine
            dataProvider={dataProvider("http://localhost:8080")}
            notificationProvider={notificationProvider}
            authProvider={authProvider}
            routerProvider={routerBindings}
            resources={[
              {
                name: "dashboard",
                list: "/",
                meta: {
                  label: "Dashboard",
                  icon: <DashboardOutlined />,
                },
              },
              {
                name: "recordings",
                list: "/recordings",
                create: "/recordings/create",
                meta: {
                  label: "Recordings",
                  icon: <VideoCameraOutlined />,
                },
              },
            ]}
            options={{
              syncWithLocation: true,
              warnWhenUnsavedChanges: true,
            }}
          >
            <Routes>
              <Route
                element={
                  <ThemedLayoutV2>
                    <Outlet />
                  </ThemedLayoutV2>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="/recordings">
                  <Route index element={<RecordingList />} />
                  <Route path="create" element={<RecordingCreate />} />
                </Route>
                <Route path="*" element={<ErrorComponent />} />
              </Route>
              <Route path="/login" element={<Login />} />
            </Routes>
            <UnsavedChangesNotifier />
            <DocumentTitleHandler />
          </Refine>
        </ConfigProvider>
    </BrowserRouter>
  );
}

export default App;
