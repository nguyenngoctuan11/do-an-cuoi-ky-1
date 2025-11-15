import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import reportWebVitals from "./reportWebVitals";
import App from "./App";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import Courses from "./pages/Courses";
import Blog from "./pages/Blog";
import BlogDetail from "./pages/BlogDetail";
import Survey from "./pages/Survey";
import PathDetail from "./pages/PathDetail";
import StudentDashboard from "./pages/student/StudentDashboard";
import MyCourses from "./pages/MyCourses";
import Mentors from "./pages/Mentors";
import FAQ from "./pages/FAQ";
import About from "./pages/About";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import LearnLayout from "./pages/learn/LearnLayout";
import CoursePlayer from "./pages/learn/CoursePlayer";
import AccountSettings from "./pages/account/AccountSettings";
import SupportInbox from "./pages/manager/SupportInbox";
import RequireAuth from "./routes/RequireAuth";
import { AuthProvider } from "./context/AuthContext";
import { SupportChatProvider } from "./context/SupportChatContext";

const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/home", element: <Home /> },
      { path: "/courses", element: <Courses /> },
      { path: "/survey", element: <Survey /> },
      { path: "/paths/:id", element: <PathDetail /> },
      { path: "/student", element: <StudentDashboard /> },
      { path: "/my-courses", element: <MyCourses /> },
      { path: "/blog", element: <Blog /> },
      { path: "/blog/:slug", element: <BlogDetail /> },
      { path: "/mentors", element: <Mentors /> },
      { path: "/faq", element: <FAQ /> },
      { path: "/about", element: <About /> },
      { path: "/contact", element: <Contact /> },
      {
        path: "/account/settings",
        element: (
          <RequireAuth>
            <AccountSettings />
          </RequireAuth>
        ),
      },
      {
        path: "/learn/:courseId",
        element: <LearnLayout />,
        children: [
          { index: true, element: <CoursePlayer /> },
          { path: "lesson/:lessonId", element: <CoursePlayer /> },
        ],
      },
      {
        path: "/manager/support",
        element: (
          <RequireAuth>
            <SupportInbox />
          </RequireAuth>
        ),
      },
      { path: "/login", element: <Login /> },
      { path: "/register", element: <Register /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <SupportChatProvider>
        <RouterProvider router={router} />
      </SupportChatProvider>
    </AuthProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
