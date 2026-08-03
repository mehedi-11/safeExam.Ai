-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jul 09, 2026 at 12:01 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `online_exam`
--

-- --------------------------------------------------------

--
-- Table structure for table `admins`
--

CREATE TABLE `admins` (
  `id` int(11) NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `reset_token` varchar(255) DEFAULT NULL,
  `reset_token_expiry` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `admins`
--

INSERT INTO `admins` (`id`, `name`, `email`, `password`, `reset_token`, `reset_token_expiry`) VALUES
(1, 'System Administrator', 'admin@exam.com', '$2a$10$4Xln9SmHFlwB.WPOhYIk9enzLHBYkm2qRUiGksgWVdfLVQceCDaom', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `admin_notifications`
--

CREATE TABLE `admin_notifications` (
  `id` int(11) NOT NULL,
  `message` text NOT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `admin_notifications`
--

INSERT INTO `admin_notifications` (`id`, `message`, `is_read`, `created_at`) VALUES
(1, 'New teacher registered: MD Mehedi Hasan (firegamingv8@gmail.com)', 1, '2026-06-28 12:45:45'),
(2, 'Teacher MD Mehedi Hasan changed exam status to LIVE: Exam 8 - 2026', 1, '2026-06-29 14:40:47'),
(3, 'Teacher MD Mehedi Hasan changed exam status to OFFLINE: Exam 8 - 2026', 1, '2026-06-29 15:15:56'),
(4, 'Teacher MD Mehedi Hasan changed exam status to LIVE: Exam 8 - 2026', 1, '2026-06-29 15:16:01'),
(5, 'Teacher MD Mehedi Hasan changed exam status to OFFLINE: Exam 8 - 2026', 1, '2026-06-29 15:16:08'),
(6, 'Teacher MD Mehedi Hasan created a new exam: Testing Exam No: 01', 0, '2026-07-09 15:39:01'),
(7, 'Teacher MD Mehedi Hasan changed exam status to LIVE: Testing Exam No: 01', 0, '2026-07-09 15:42:38'),
(8, 'Teacher MD Mehedi Hasan changed exam status to OFFLINE: Testing Exam No: 01', 0, '2026-07-09 15:42:54'),
(9, 'Teacher MD Mehedi Hasan changed exam status to LIVE: Testing Exam No: 01', 0, '2026-07-09 15:45:34');

-- --------------------------------------------------------

--
-- Table structure for table `exams`
--

CREATE TABLE `exams` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `exam_date` datetime NOT NULL,
  `duration_minutes` int(11) NOT NULL,
  `end_time` datetime NOT NULL DEFAULT current_timestamp(),
  `type` enum('MCQ','Written','Both') DEFAULT 'MCQ',
  `is_live` tinyint(1) DEFAULT 0,
  `exam_password` varchar(255) DEFAULT NULL,
  `must_on_camera` tinyint(1) DEFAULT 1,
  `must_on_microphone` tinyint(1) DEFAULT 1,
  `teacher_id` int(11) DEFAULT NULL,
  `course_name` varchar(255) DEFAULT NULL,
  `course_code` varchar(100) DEFAULT NULL,
  `university_name` varchar(255) DEFAULT NULL,
  `max_attempts` int(11) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `exams`
--

INSERT INTO `exams` (`id`, `title`, `exam_date`, `duration_minutes`, `end_time`, `type`, `is_live`, `exam_password`, `must_on_camera`, `must_on_microphone`, `teacher_id`, `course_name`, `course_code`, `university_name`, `max_attempts`) VALUES
(52, 'Testing Exam No: 01', '2026-07-09 15:40:00', 60, '2026-07-09 15:39:01', 'Both', 1, '1234', 1, 1, 12, 'Science', 'S201', 'Dhaka University', 1);

-- --------------------------------------------------------

--
-- Table structure for table `exam_questions`
--

CREATE TABLE `exam_questions` (
  `id` int(11) NOT NULL,
  `exam_id` int(11) DEFAULT NULL,
  `question_text` text NOT NULL,
  `type` enum('MCQ','Written') DEFAULT 'MCQ',
  `marks` int(11) NOT NULL DEFAULT 1,
  `option_a` varchar(255) DEFAULT NULL,
  `option_b` varchar(255) DEFAULT NULL,
  `option_c` varchar(255) DEFAULT NULL,
  `option_d` varchar(255) DEFAULT NULL,
  `correct_option` enum('A','B','C','D') DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `exam_questions`
--

INSERT INTO `exam_questions` (`id`, `exam_id`, `question_text`, `type`, `marks`, `option_a`, `option_b`, `option_c`, `option_d`, `correct_option`) VALUES
(157, 52, 'what is your name?', 'Written', 1, NULL, NULL, NULL, NULL, 'A'),
(158, 52, 'Select A', 'MCQ', 1, 'A', 'B', 'C', 'D', 'A');

-- --------------------------------------------------------

--
-- Table structure for table `login_attempts`
--

CREATE TABLE `login_attempts` (
  `id` int(11) NOT NULL,
  `identifier` varchar(100) DEFAULT NULL,
  `failed_count` int(11) DEFAULT 0,
  `blocked_until` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `login_attempts`
--

INSERT INTO `login_attempts` (`id`, `identifier`, `failed_count`, `blocked_until`) VALUES
(1, 'mehedi.admin@exam.com', 1, NULL),
(3, '232005048', 1, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `proctoring_logs`
--

CREATE TABLE `proctoring_logs` (
  `id` int(11) NOT NULL,
  `exam_id` int(11) DEFAULT NULL,
  `student_id` varchar(50) DEFAULT NULL,
  `activity_type` varchar(100) NOT NULL,
  `details` text DEFAULT NULL,
  `timestamp` datetime DEFAULT current_timestamp(),
  `demerit_points` int(11) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `students`
--

CREATE TABLE `students` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `profile_image` varchar(255) DEFAULT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `reset_token` varchar(255) DEFAULT NULL,
  `reset_token_expiry` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `students`
--

INSERT INTO `students` (`id`, `name`, `email`, `password`, `profile_image`, `status`, `reset_token`, `reset_token_expiry`) VALUES
('232004048', 'MD Mehedi Hasan', 'mehedimridul1919@gmail.com', '$2a$10$OV4pTMbzaPUvmM3vDJUkpephaYeyIRtfO5iSdzCM/Ydvg63RQeY5C', NULL, 'approved', NULL, NULL),
('STU1001', 'Rahul Gupta', 'student1@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1002', 'Rohan Kumar', 'student2@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1003', 'Rita Chowdhury', 'student3@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1004', 'Ashok Roy', 'student4@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1005', 'Karan Sharma', 'student5@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1006', 'Rohan Gupta', 'student6@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1007', 'Raj Roy', 'student7@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1008', 'Meena Jain', 'student8@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1009', 'Rahul Gupta', 'student9@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1010', 'Geeta Das', 'student10@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1011', 'Geeta Sharma', 'student11@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1012', 'Rahul Gupta', 'student12@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1013', 'Rita Gupta', 'student13@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1014', 'Raj Jain', 'student14@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1015', 'Karan Patel', 'student15@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1016', 'Rita Das', 'student16@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1017', 'Sunil Verma', 'student17@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1018', 'Rita Gupta', 'student18@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1019', 'Neha Chowdhury', 'student19@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1020', 'Manoj Verma', 'student20@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1021', 'Anjali Kumar', 'student21@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1022', 'Priya Jain', 'student22@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1023', 'Geeta Kumar', 'student23@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1024', 'Karan Verma', 'student24@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1025', 'Anita Roy', 'student25@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1026', 'Anita Chowdhury', 'student26@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1027', 'Meena Jain', 'student27@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1028', 'Rohan Singh', 'student28@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1029', 'Rohan Jain', 'student29@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1030', 'Amit Gupta', 'student30@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1031', 'Amit Gupta', 'student31@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1032', 'Ashok Sharma', 'student32@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1033', 'Pooja Sharma', 'student33@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1034', 'Geeta Jain', 'student34@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1035', 'Neha Kumar', 'student35@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1036', 'Geeta Das', 'student36@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1037', 'Vikram Das', 'student37@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1038', 'Rahul Gupta', 'student38@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1039', 'Rahul Gupta', 'student39@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1040', 'Kavita Das', 'student40@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1041', 'Pooja Verma', 'student41@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1042', 'Rita Jain', 'student42@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1043', 'Priya Chowdhury', 'student43@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1044', 'Ashok Patel', 'student44@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1045', 'Meena Patel', 'student45@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1046', 'Anita Patel', 'student46@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1047', 'Anita Patel', 'student47@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1048', 'Rita Roy', 'student48@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1049', 'Kavita Singh', 'student49@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1050', 'Kavita Roy', 'student50@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1051', 'Meena Verma', 'student51@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1052', 'Priya Kumar', 'student52@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1053', 'Pooja Singh', 'student53@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1054', 'Sneha Chowdhury', 'student54@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1055', 'Ashok Roy', 'student55@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1056', 'Rahul Chowdhury', 'student56@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1057', 'Rahul Patel', 'student57@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1058', 'Kavita Jain', 'student58@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1059', 'Rohan Das', 'student59@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1060', 'Pooja Singh', 'student60@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1061', 'Anita Sharma', 'student61@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1062', 'Priya Jain', 'student62@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1063', 'Sneha Chowdhury', 'student63@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1064', 'Manoj Sharma', 'student64@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1065', 'Manoj Verma', 'student65@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1066', 'Sunil Patel', 'student66@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1067', 'Rahul Singh', 'student67@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1068', 'Pooja Kumar', 'student68@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1069', 'Vikram Das', 'student69@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1070', 'Sanjay Das', 'student70@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1071', 'Sunil Singh', 'student71@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1072', 'Neha Gupta', 'student72@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1073', 'Manoj Das', 'student73@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1074', 'Sneha Jain', 'student74@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1075', 'Sanjay Kumar', 'student75@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1076', 'Anita Singh', 'student76@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1077', 'Priya Sharma', 'student77@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1078', 'Kavita Patel', 'student78@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1079', 'Rahul Sharma', 'student79@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1080', 'Rohan Singh', 'student80@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1081', 'Rohan Roy', 'student81@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1082', 'Meena Sharma', 'student82@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1083', 'Karan Singh', 'student83@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1084', 'Neha Sharma', 'student84@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1085', 'Raj Das', 'student85@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1086', 'Raj Chowdhury', 'student86@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1087', 'Sunil Patel', 'student87@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1088', 'Kavita Jain', 'student88@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1089', 'Raj Gupta', 'student89@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1090', 'Rita Chowdhury', 'student90@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1091', 'Neha Kumar', 'student91@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1092', 'Karan Singh', 'student92@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1093', 'Anita Roy', 'student93@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1094', 'Karan Chowdhury', 'student94@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1095', 'Raj Chowdhury', 'student95@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1096', 'Raj Das', 'student96@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1097', 'Rita Das', 'student97@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1098', 'Priya Patel', 'student98@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1099', 'Sunil Sharma', 'student99@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL),
('STU1100', 'Manoj Verma', 'student100@exam.com', '$2a$10$2/RiTC7TyONyJM66rqtvYuoOfwU0iw4NKoBRyrXdwtVov3HAQUJ2S', NULL, 'approved', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `student_answers`
--

CREATE TABLE `student_answers` (
  `id` int(11) NOT NULL,
  `student_id` varchar(50) DEFAULT NULL,
  `exam_id` int(11) DEFAULT NULL,
  `question_id` int(11) DEFAULT NULL,
  `student_answer` text DEFAULT NULL,
  `marks_awarded` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `student_answers`
--

INSERT INTO `student_answers` (`id`, `student_id`, `exam_id`, `question_id`, `student_answer`, `marks_awarded`) VALUES
(1, '232004048', 52, 157, 'MD Mehedi Hasan Mridul', 1),
(2, '232004048', 52, 158, 'A', 1);

-- --------------------------------------------------------

--
-- Table structure for table `student_exams`
--

CREATE TABLE `student_exams` (
  `id` int(11) NOT NULL,
  `student_id` varchar(50) DEFAULT NULL,
  `exam_id` int(11) DEFAULT NULL,
  `started_at` datetime DEFAULT current_timestamp(),
  `finished_at` datetime DEFAULT NULL,
  `status` enum('started','completed','blocked') DEFAULT 'started',
  `demerit_points` int(11) DEFAULT 0,
  `score` int(11) DEFAULT NULL,
  `ai_grading_completed` tinyint(1) DEFAULT 0,
  `block_until` datetime DEFAULT NULL,
  `attempts` int(11) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `student_exams`
--

INSERT INTO `student_exams` (`id`, `student_id`, `exam_id`, `started_at`, `finished_at`, `status`, `demerit_points`, `score`, `ai_grading_completed`, `block_until`, `attempts`) VALUES
(1, '232004048', 52, '2026-07-09 15:48:57', '2026-07-09 15:50:13', 'completed', 0, 2, 0, NULL, 1);

-- --------------------------------------------------------

--
-- Table structure for table `teachers`
--

CREATE TABLE `teachers` (
  `id` int(11) NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `profile_image` varchar(255) DEFAULT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `joining_date` date DEFAULT curdate(),
  `llm_api_key` varchar(255) DEFAULT NULL,
  `reset_token` varchar(255) DEFAULT NULL,
  `reset_token_expiry` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `teachers`
--

INSERT INTO `teachers` (`id`, `name`, `email`, `password`, `profile_image`, `status`, `joining_date`, `llm_api_key`, `reset_token`, `reset_token_expiry`) VALUES
(1, 'Prof. Raj Patel', 'teacher1@exam.com', '$2a$10$WEwZl7IsFnUwXSLoEqsTZOxEIxP6BKLacqCM34md2Z6pHpcqu9fRa', NULL, 'approved', '2026-01-01', NULL, NULL, NULL),
(2, 'Prof. Sunil Das', 'teacher2@exam.com', '$2a$10$WEwZl7IsFnUwXSLoEqsTZOxEIxP6BKLacqCM34md2Z6pHpcqu9fRa', NULL, 'approved', '2026-01-01', NULL, NULL, NULL),
(3, 'Prof. Rohan Kumar', 'teacher3@exam.com', '$2a$10$WEwZl7IsFnUwXSLoEqsTZOxEIxP6BKLacqCM34md2Z6pHpcqu9fRa', NULL, 'approved', '2026-01-01', NULL, NULL, NULL),
(4, 'Prof. Karan Patel', 'teacher4@exam.com', '$2a$10$WEwZl7IsFnUwXSLoEqsTZOxEIxP6BKLacqCM34md2Z6pHpcqu9fRa', NULL, 'approved', '2026-01-01', NULL, NULL, NULL),
(5, 'Prof. Pooja Verma', 'teacher5@exam.com', '$2a$10$WEwZl7IsFnUwXSLoEqsTZOxEIxP6BKLacqCM34md2Z6pHpcqu9fRa', NULL, 'approved', '2026-01-01', NULL, NULL, NULL),
(6, 'Prof. Priya Verma', 'teacher6@exam.com', '$2a$10$WEwZl7IsFnUwXSLoEqsTZOxEIxP6BKLacqCM34md2Z6pHpcqu9fRa', NULL, 'approved', '2026-01-01', NULL, NULL, NULL),
(7, 'Prof. Karan Patel', 'teacher7@exam.com', '$2a$10$WEwZl7IsFnUwXSLoEqsTZOxEIxP6BKLacqCM34md2Z6pHpcqu9fRa', NULL, 'approved', '2026-01-01', NULL, NULL, NULL),
(8, 'Prof. Pooja Patel', 'teacher8@exam.com', '$2a$10$WEwZl7IsFnUwXSLoEqsTZOxEIxP6BKLacqCM34md2Z6pHpcqu9fRa', NULL, 'approved', '2026-01-01', NULL, NULL, NULL),
(9, 'Prof. Rohan Kumar', 'teacher9@exam.com', '$2a$10$WEwZl7IsFnUwXSLoEqsTZOxEIxP6BKLacqCM34md2Z6pHpcqu9fRa', NULL, 'approved', '2026-01-01', NULL, NULL, NULL),
(10, 'Prof. Meena Gupta', 'teacher10@exam.com', '$2a$10$WEwZl7IsFnUwXSLoEqsTZOxEIxP6BKLacqCM34md2Z6pHpcqu9fRa', NULL, 'approved', '2026-01-01', NULL, NULL, NULL),
(12, 'MD Mehedi Hasan', 'firegamingv8@gmail.com', '$2a$10$nZFo6wp8sVi1AAkiNjneCO4KY8QpCPGudRcZk/UKIEus.2cQGWg52', NULL, 'approved', '2026-06-28', NULL, NULL, NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admins`
--
ALTER TABLE `admins`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `admin_notifications`
--
ALTER TABLE `admin_notifications`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `exams`
--
ALTER TABLE `exams`
  ADD PRIMARY KEY (`id`),
  ADD KEY `teacher_id` (`teacher_id`);

--
-- Indexes for table `exam_questions`
--
ALTER TABLE `exam_questions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `exam_id` (`exam_id`);

--
-- Indexes for table `login_attempts`
--
ALTER TABLE `login_attempts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `identifier` (`identifier`);

--
-- Indexes for table `proctoring_logs`
--
ALTER TABLE `proctoring_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `exam_id` (`exam_id`),
  ADD KEY `student_id` (`student_id`);

--
-- Indexes for table `students`
--
ALTER TABLE `students`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `student_answers`
--
ALTER TABLE `student_answers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `student_id` (`student_id`),
  ADD KEY `exam_id` (`exam_id`),
  ADD KEY `question_id` (`question_id`);

--
-- Indexes for table `student_exams`
--
ALTER TABLE `student_exams`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `student_id_2` (`student_id`,`exam_id`),
  ADD KEY `student_id` (`student_id`),
  ADD KEY `exam_id` (`exam_id`);

--
-- Indexes for table `teachers`
--
ALTER TABLE `teachers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admins`
--
ALTER TABLE `admins`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `admin_notifications`
--
ALTER TABLE `admin_notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `exams`
--
ALTER TABLE `exams`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=53;

--
-- AUTO_INCREMENT for table `exam_questions`
--
ALTER TABLE `exam_questions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=159;

--
-- AUTO_INCREMENT for table `login_attempts`
--
ALTER TABLE `login_attempts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `proctoring_logs`
--
ALTER TABLE `proctoring_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `student_answers`
--
ALTER TABLE `student_answers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `student_exams`
--
ALTER TABLE `student_exams`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `teachers`
--
ALTER TABLE `teachers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `exams`
--
ALTER TABLE `exams`
  ADD CONSTRAINT `exams_ibfk_1` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `exam_questions`
--
ALTER TABLE `exam_questions`
  ADD CONSTRAINT `exam_questions_ibfk_1` FOREIGN KEY (`exam_id`) REFERENCES `exams` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `proctoring_logs`
--
ALTER TABLE `proctoring_logs`
  ADD CONSTRAINT `proctoring_logs_ibfk_1` FOREIGN KEY (`exam_id`) REFERENCES `exams` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `proctoring_logs_ibfk_2` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `student_answers`
--
ALTER TABLE `student_answers`
  ADD CONSTRAINT `student_answers_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `student_answers_ibfk_2` FOREIGN KEY (`exam_id`) REFERENCES `exams` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `student_answers_ibfk_3` FOREIGN KEY (`question_id`) REFERENCES `exam_questions` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `student_exams`
--
ALTER TABLE `student_exams`
  ADD CONSTRAINT `student_exams_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `student_exams_ibfk_2` FOREIGN KEY (`exam_id`) REFERENCES `exams` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
