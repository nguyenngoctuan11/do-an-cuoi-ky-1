import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "../App";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Home from "../pages/Home";
import Courses from "../pages/Courses";
import CourseDetail from "../pages/CourseDetail";
import Blog from "../pages/Blog";
import BlogDetail from "../pages/BlogDetail";
import Pricing from "../pages/Pricing";
import Survey from "../pages/Survey";
import PathDetail from "../pages/PathDetail";
import StudentDashboard from "../pages/student/StudentDashboard";
import MyCourses from "../pages/MyCourses";
import Mentors from "../pages/Mentors";
import FAQ from "../pages/FAQ";
import About from "../pages/About";
import Contact from "../pages/Contact";
import NotFound from "../pages/NotFound";
import LearnLayout from "../pages/learn/LearnLayout";
import CoursePlayer from "../pages/learn/CoursePlayer";
import QuizIntro from "../pages/quiz/QuizIntro";
import QuizRun from "../pages/quiz/QuizRun";
import QuizResult from "../pages/quiz/QuizResult";
import Checkout from "../pages/checkout/Checkout";
import CheckoutSuccess from "../pages/checkout/CheckoutSuccess";
import CheckoutFailed from "../pages/checkout/CheckoutFailed";
import AccountSettings from "../pages/account/AccountSettings";
import RequireAuth from "./RequireAuth";

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
      { path: "/courses/:slug", element: <CourseDetail /> },
      { path: "/blog", element: <Blog /> },
      { path: "/blog/:slug", element: <BlogDetail /> },
      { path: "/pricing", element: <Pricing /> },
      { path: "/mentors", element: <Mentors /> },
      { path: "/faq", element: <FAQ /> },
      { path: "/about", element: <About /> },
      { path: "/contact", element: <Contact /> },
      { path: "/checkout", element: <Checkout /> },
      { path: "/checkout/success", element: <CheckoutSuccess /> },
      { path: "/checkout/failed", element: <CheckoutFailed /> },
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
      { path: "/quiz/:courseId", element: <QuizIntro /> },
      { path: "/quiz/:courseId/run", element: <QuizRun /> },
      { path: "/quiz/:courseId/result", element: <QuizResult /> },
      { path: "/login", element: <Login /> },
      { path: "/register", element: <Register /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
