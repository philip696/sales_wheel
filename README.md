Yes — I’ll keep the **old README’s overall structure and section order**, but rewrite the contents so they accurately reflect the current `backend-api` branch and its actual files.

The existing README already establishes the structure around **Tech Stack → Quick Start → What the App Does → App Flow → Route Structure → Auth → Sales Flow → Attendance → Spin → Admin → Data Model → Services → Configuration → Status → Development Workflow → Security → Architecture → Database → Business Rules → Project Structure → Final Architecture Principle**. ([GitHub][1])

I would preserve that organization rather than replacing it with a completely different README.

# Sales Attendance & Spin Wheel App

This app is a mobile sales workflow system built with **Expo Router, React Native, TypeScript, and Supabase**.

It is designed around the sales visit lifecycle:

1. Sales users sign up and sign in.
2. Sales users select a store.
3. The app verifies the user's GPS position relative to the store.
4. The user captures attendance evidence using the device camera.
5. The captured photo is checked for a face before continuing.
6. Attendance evidence is submitted through the application service layer to Supabase.
7. Supabase applies the authoritative attendance rules.
8. Approved attendance allows the user to request a spin.
9. Supabase validates spin eligibility and selects the reward.
10. The mobile app displays the result.

The main architectural principle is:

> **The frontend coordinates the workflow; Supabase enforces the business rules.**

The mobile application should never be treated as the authority for attendance approval, GPS approval, reward selection, duplicate prevention, or authorization.

---

# Tech Stack

| Technology                     | Version                 |
| ------------------------------ | ----------------------- |
| Node.js                        | See project environment |
| npm                            | See project environment |
| Expo                           | `~54.0.36`              |
| Expo SDK                       | `54`                    |
| React                          | `19.1.0`                |
| React Native                   | `0.81.5`                |
| TypeScript                     | `~5.9.2`                |
| Expo Router                    | `~6.0.24`               |
| Supabase JS                    | `^2.112.2`              |
| React Native Reanimated        | `~4.1.1`                |
| React Native Screens           | `~4.16.0`               |
| React Native Safe Area Context | `~5.6.1`                |
| Expo Camera                    | `~17.0.10`              |
| Expo Location                  | `~19.0.8`               |
| Expo Secure Store              | `~15.0.8`               |

## Complete Dependency Versions

### Runtime Dependencies

| Package                                     | Version    |
| ------------------------------------------- | ---------- |
| `@react-native-async-storage/async-storage` | `2.2.0`    |
| `@supabase/supabase-js`                     | `^2.112.2` |
| `expo`                                      | `~54.0.36` |
| `expo-camera`                               | `~17.0.10` |
| `expo-constants`                            | `~18.0.13` |
| `expo-font`                                 | `~14.0.12` |
| `expo-linking`                              | `~8.0.12`  |
| `expo-location`                             | `~19.0.8`  |
| `expo-router`                               | `~6.0.24`  |
| `expo-secure-store`                         | `~15.0.8`  |
| `expo-splash-screen`                        | `~31.0.12` |
| `expo-status-bar`                           | `~3.0.9`   |
| `expo-symbols`                              | `~1.0.8`   |
| `expo-web-browser`                          | `~15.0.11` |
| `react`                                     | `19.1.0`   |
| `react-dom`                                 | `19.1.0`   |
| `react-native`                              | `0.81.5`   |
| `react-native-reanimated`                   | `~4.1.1`   |
| `react-native-safe-area-context`            | `~5.6.1`   |
| `react-native-screens`                      | `~4.16.0`  |
| `react-native-url-polyfill`                 | `^4.0.0`   |
| `react-native-web`                          | `~0.21.0`  |
| `react-native-worklets`                     | `0.5.1`    |

### Development Dependencies

| Package             | Version    |
| ------------------- | ---------- |
| `@types/react`      | `~19.1.0`  |
| `babel-preset-expo` | `~54.0.12` |
| `typescript`        | `~5.9.2`   |

## Application Version

```text
Application: sales-spin-app-v2
Version: 1.0.0
```

## Expo / React Native Compatibility

The current branch targets:

```text
Expo SDK       54
Expo           ~54.0.36
React          19.1.0
React Native   0.81.5
Expo Router    ~6.0.24
TypeScript     ~5.9.2
```

`package.json` is the source of truth for direct dependency versions, while `package-lock.json` contains the resolved dependency tree.

---

# Quick Start

```bash
cd sales-spin-app-v2
npm install
npm start
```

The Expo application connects to Supabase through:

```text
src/lib/config.ts
src/lib/supabase.ts
```

The face-detection service is configured through:

```text
EXPO_PUBLIC_FACE_API_URL
```

For a physical phone, the face-service URL must normally use the computer's LAN IP rather than `localhost`.

---

## Available Scripts

### Start Expo

```bash
npm start
```

### Start Android

```bash
npm run android
```

### Start iOS

```bash
npm run ios
```

### Start Web

```bash
npm run web
```

---

# What the App Does

The application is structured around the sales visit lifecycle:

```text
User
 ↓
Authentication
 ↓
Sales Profile
 ↓
Store Selection
 ↓
GPS Verification
 ↓
Camera Capture
 ↓
Face Detection
 ↓
Attendance Submission
 ↓
Backend Attendance Validation
 ↓
Approved Attendance
 ↓
Spin Request
 ↓
Backend Eligibility Validation
 ↓
Server-Side Reward Selection
 ↓
Reward Result
```

The frontend collects the information and presents the result.

Supabase is responsible for determining whether the operation is valid.

---

# App Flow

## Authentication Flow

```text
App Launch
    ↓
Root Layout
    ↓
AuthProvider
    ↓
Get Session
    ↓
Session exists?
   / \
 No   Yes
 ↓     ↓
Login  Load Sales Profile
       ↓
       Role?
      /    \
   Admin   Sales
     ↓       ↓
  /admin  /(sales)
```

The root application initializes authentication and determines which part of the application the user should enter.

---

## Attendance and Spin Flow

```text
Select Store
     ↓
GPS Verification
     ↓
Within Radius?
   /        \
 No          Yes
 ↓            ↓
Reject     Camera Capture
              ↓
          Face Detection
              ↓
           Preview
              ↓
      Submit Attendance
              ↓
       Backend Validation
              ↓
       Attendance Approved?
          /          \
        No            Yes
        ↓              ↓
   Show Reason     Request Spin
                       ↓
                Backend Validation
                       ↓
                Weighted Reward
                       ↓
                  Spin Result
```

---

# Route Structure

The `app/` directory is the application's navigation tree.

Each route represents a screen or navigation layout.

```text
app/
├── _layout.tsx
├── index.tsx
│
├── auth/
│   ├── login.tsx
│   └── signup.tsx
│
├── (sales)/
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── stores.tsx
│   ├── history.tsx
│   │
│   ├── attendance/
│   │   ├── index.tsx
│   │   ├── camera.tsx
│   │   ├── preview.tsx
│   │   └── result.tsx
│   │
│   └── spin/
│       ├── index.tsx
│       └── result.tsx
│
└── admin/
    ├── _layout.tsx
    └── *.tsx
```

---

# Startup and Auth Flow

## Root Layout

`app/_layout.tsx` is the top-level application bootstrap.

It is responsible for:

* loading fonts,
* controlling the splash screen,
* initializing the root navigation stack,
* loading the required providers.

The main providers are:

```text
AuthProvider
AttendanceFlowProvider
```

`AuthProvider` manages authentication and the sales profile.

`AttendanceFlowProvider` stores temporary state shared between attendance screens.

---

## Redirect Gate

`app/index.tsx` is the application's route gate.

After authentication finishes loading:

```text
No session
    ↓
/auth/login
```

or:

```text
Session exists
    ↓
Load sales profile
    ↓
Admin?
 ┌───────┴───────┐
Yes              No
 ↓                ↓
/admin          /(sales)
```

This is the first file to inspect when authentication succeeds but navigation goes to the wrong section.

---

# Authentication

## Auth Context

The authentication controller is located in:

```text
src/features/auth/AuthContext.tsx
```

It exposes:

```text
session
user
profile
isLoading
isAdmin
signIn()
signUp()
signOut()
refreshProfile()
```

### Session Initialization

The current flow is:

1. `supabase.auth.getSession()` loads the persisted session.
2. `supabase.auth.onAuthStateChange()` keeps the session synchronized.
3. When a session exists, the matching `public.sales` profile is loaded.
4. The device is registered through the device service.

---

## Sign In

Sign-in uses the current authentication token flow.

The process is:

1. Submit credentials.
2. Receive authentication tokens.
3. Pass the tokens into `supabase.auth.setSession()`.
4. Record a login audit event.
5. Register the device.
6. Load the user's sales profile.
7. Continue to the appropriate route.

---

## Sign Up

Sales registration uses the backend RPC:

```text
signup_sales_user
```

The RPC is responsible for the server-side registration process.

It validates:

* username,
* email,
* password,
* duplicate usernames,
* duplicate email addresses.

It then creates the authentication user and corresponding sales profile.

Sign-up and sign-in are separate operations in the current implementation.

---

# Login and Sign Up Screens

The screens are:

```text
app/auth/login.tsx
app/auth/signup.tsx
```

These screens primarily handle:

* input,
* local validation,
* user feedback,
* navigation.

## Login Screen

The login screen:

* validates email format,
* validates password length,
* calls `signIn()`,
* navigates into the application after authentication.

It also contains a development-only GPS prototype entry.

## Sign Up Screen

The sign-up screen validates:

* username,
* email,
* password,
* password confirmation.

It then calls:

```text
signUp({
  username,
  email,
  password,
  name
})
```

After successful registration, the user returns to the login screen.

---

# Sales Flow

The sales application is located under:

```text
app/(sales)/
```

The sales workflow is divided into:

```text
Sales Home
    ↓
Store Selection
    ↓
Attendance
    ↓
Spin
    ↓
History
```

---

# Sales Home

The sales home screen is:

```text
app/(sales)/index.tsx
```

It provides entry points for:

* selecting a store,
* testing the GPS prototype,
* viewing history,
* signing out.

---

# Attendance Flow State

Shared attendance state is handled by:

```text
src/features/attendance/AttendanceFlowContext.tsx
```

Current transient state includes:

```text
selectedStore
photoUri
```

The context exists because attendance is a multi-screen workflow.

For example:

```text
Store Selection
      ↓
GPS
      ↓
Camera
      ↓
Preview
      ↓
Result
```

The selected store and captured photo need to survive those route transitions.

---

# Store Selection

The store selection screen is:

```text
app/(sales)/stores.tsx
```

Store access is handled through:

```text
src/services/storeService.ts
```

The service searches active stores and supports:

* store name search,
* store code search,
* address search,
* pagination,
* search sanitization.

The store data comes from:

```text
public.stores
```

After selecting a store:

```text
Selected Store
      ↓
AttendanceFlowContext
      ↓
Attendance Flow
```

---

# GPS Verification

The GPS verification screen is:

```text
app/(sales)/attendance/index.tsx
```

GPS logic is handled by:

```text
src/features/gps/useGpsVerification.ts
```

Distance calculations are implemented in:

```text
src/utils/distance.ts
```

The distance utility uses the Haversine formula and returns the distance in meters.

The GPS flow:

1. Request foreground location permission.
2. Read the current location.
3. Obtain GPS accuracy.
4. Calculate distance from the selected store.
5. Compare the distance against the configured store radius.
6. Return the verification result.

---

## Important Security Rule

The frontend GPS calculation is **not authoritative**.

The architecture is:

```text
Frontend GPS
     ↓
User feedback
     ↓
Attendance submission
     ↓
Backend GPS validation
     ↓
Authoritative result
```

The frontend cannot simply mark an attendance as approved.

---

# Camera Capture

The camera screen is:

```text
app/(sales)/attendance/camera.tsx
```

It uses:

```text
expo-camera
```

The attendance flow intentionally uses the device camera instead of a gallery picker.

The current process is:

1. Request camera permission.
2. Open the back camera.
3. Capture a fresh image.
4. Send the image to the face-detection service.
5. If no face is detected, show the failure reason.
6. Allow the user to retake the photo.
7. Once a face is detected, save the local URI.
8. Navigate to the preview screen.

---

# Face Verification

Face checking currently has two planned phases.

## Phase 1 — Face Detection

**Implemented**

The current implementation checks whether the captured attendance photo contains a face.

This is **face detection**, not face identification.

The application service is:

```text
src/services/faceDetectionService.ts
```

The standalone Python service is:

```text
face-service/app.py
```

The face service uses:

```text
FastAPI
DeepFace
RetinaFace
```

It runs separately from the Expo application because the Python face-processing stack is not bundled into the React Native application.

---

## Running the Face Service

From the project root:

```bash
cd face-service
pip install -r requirements.txt
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

Then configure:

```text
EXPO_PUBLIC_FACE_API_URL=http://<your-machine-ip>:8000
```

When testing from a physical phone, use the computer's LAN IP.

Do not normally use:

```text
http://localhost:8000
```

because `localhost` from the phone refers to the phone itself.

---

## Phase 2 — Face Matching

**Not yet implemented**

The current face detection only answers:

> "Does this image contain a face?"

It does not answer:

> "Does this face belong to the authenticated sales representative?"

A draft migration exists:

```text
supabase/migrations/006_face_verification_draft.sql
```

This file is currently a **commented draft** and is not part of the active migration sequence.

The intended future architecture includes:

```text
Sales Reference Photo
        ↓
Private Storage
        ↓
Captured Attendance Photo
        ↓
Face Matching Service
        ↓
Backend Result
        ↓
Attendance Decision
```

The future implementation will require:

* reference-photo enrollment,
* a reference photo path for the sales profile,
* face matching,
* match attempt logging,
* backend-authoritative matching.

The mobile application must not independently decide whether two faces match.

---

# Attendance Preview and Result

## Preview

The preview screen is:

```text
app/(sales)/attendance/preview.tsx
```

It displays the captured attendance image before the final attendance operation.

The final attendance integration is still being wired into this screen.

## Result

The result screen is:

```text
app/(sales)/attendance/result.tsx
```

It is responsible for presenting the backend attendance result, including information such as:

* approved/rejected state,
* rejection reason,
* relevant attendance information.

The backend remains the authority for the final decision.

---

# Attendance Service

The application-facing attendance service is:

```text
src/services/attendanceService.ts
```

Its responsibilities include:

1. Reading the authenticated Supabase user.
2. Uploading the captured photo.
3. Using the private `attendance-photos` storage bucket.
4. Creating a photo path based on the sales ID, store ID, and UUID.
5. Calling the backend attendance RPC.
6. Returning the structured result to the application.

The main RPC is:

```text
submit_attendance
```

The service also provides access to attendance history and attendance photo URLs.

The preferred architecture is:

```text
Attendance Screen
       ↓
attendanceService
       ↓
submit_attendance RPC
       ↓
Supabase
```

---

# Spin Flow

The spin flow lives under:

```text
app/(sales)/spin/
```

## Spin Screen

The wheel screen is:

```text
app/(sales)/spin/index.tsx
```

The application does **not** decide the reward locally.

The backend controls:

* spin eligibility,
* duplicate prevention,
* reward selection,
* reward probability,
* final reward.

---

## Result Screen

The result screen is:

```text
app/(sales)/spin/result.tsx
```

It is responsible for displaying the reward returned by the backend.

The final result UX is still being completed.

---

# Spin Service

The spin service is:

```text
src/services/spinService.ts
```

The main backend operation is:

```text
request_spin
```

The service handles the application-facing request and returns information such as:

* spin ID,
* spin status,
* reward data,
* rejection reason.

---

## Why Reward Selection Is Server-Side

Reward randomization must not happen in React Native.

The correct flow is:

```text
Mobile App
    ↓
request_spin
    ↓
Authenticate User
    ↓
Validate Attendance
    ↓
Check Daily Uniqueness
    ↓
Weighted Reward Selection
    ↓
Create Spin Record
    ↓
Return Result
```

This prevents the client from manipulating the reward outcome.

---

# History Screens

The sales history screen is:

```text
app/(sales)/history.tsx
```

The screen is currently scaffolded.

The required service methods already exist:

```text
attendanceService.ts
    └── getMyAttendanceHistory()

spinService.ts
    └── getMySpinHistory()
```

When completing the history UI, route components should use these services rather than making direct database queries.

---

# Admin Flow

The admin application lives under:

```text
app/admin/
```

## Admin Layout

```text
app/admin/_layout.tsx
```

defines the admin navigation stack.

## Admin Dashboard

```text
app/admin/index.tsx
```

is the admin entry screen.

The current admin routes are scaffolds for functionality such as:

* attendance monitoring,
* spin monitoring,
* store management,
* sales management,
* reward management.

The intended access model is:

```text
Sales User
    ↓
Own profile
Own attendance
Own spins
Own relevant data


Admin
    ↓
Authorized operational data
Attendance monitoring
Spin monitoring
Store management
Sales management
Reward management
```

Admin authorization must ultimately be enforced through the backend/database security layer, not only by hiding frontend routes.

---

# Data Model

The database schema is defined through:

```text
supabase/migrations/
```

## Main Tables

### `sales`

Stores the application's sales profile.

The profile is associated with:

```text
auth.users.id
```

### `stores`

Stores information such as:

* store name,
* store code,
* address,
* latitude,
* longitude,
* radius,
* status.

### `attendance`

Stores:

* sales user,
* store,
* GPS coordinates,
* GPS accuracy,
* attendance photo path,
* attendance status,
* rejection reason,
* timestamps.

### `rewards`

Stores:

* reward definitions,
* reward probabilities,
* reward status/configuration.

### `spins`

Stores:

* sales user,
* store,
* spin date,
* selected reward,
* spin status.

### `devices`

Stores device identifiers associated with application users.

### `audit_logs`

Stores important application events such as:

* login,
* attendance actions,
* GPS rejection,
* camera actions,
* spin actions,
* other security/business events.

---

# Important Database Constraints

The database is responsible for enforcing important business rules.

## Attendance

Attendance status is controlled by backend logic.

The frontend cannot independently approve attendance.

## One Spin Per Store Per Day

The `spins` table enforces uniqueness for:

```text
(sales_id, store_id, spin_date)
```

This prevents a sales user from obtaining multiple spins for the same store on the same day.

## Store Radius

Store radius is stored with the store configuration and constrained by the database.

## Reward Probability

Reward probability is stored server-side and used for weighted reward selection.

---

# Row Level Security

RLS policies are defined in:

```text
supabase/migrations/002_rls_policies.sql
```

The application tables use Row Level Security.

The fundamental rule is:

> Users can only access data they are authorized to access.

Administrative access is determined through:

```text
is_admin()
```

This is important because frontend route protection alone is not sufficient security.

---

# Storage

Storage configuration is defined in:

```text
supabase/migrations/003_storage_and_functions.sql
```

Attendance photos are stored in the private:

```text
attendance-photos
```

bucket.

Attendance photos should not be exposed through a public bucket.

The application uses the attendance service to resolve photo access when required.

---

# Backend RPC Functions

The main backend functions are:

```text
submit_attendance
request_spin
signup_sales_user
is_admin
haversine_distance_meters
```

---

## `submit_attendance`

This function is responsible for the authoritative attendance operation.

It:

1. Checks authentication.
2. Loads the selected store.
3. Calculates distance from the store.
4. Checks the store radius.
5. Checks GPS accuracy.
6. Requires a valid photo path.
7. Creates the attendance record.
8. Writes an audit event.
9. Returns the backend result.

The mobile application does not determine final attendance approval.

---

## `request_spin`

This function:

1. Checks authentication.
2. Verifies the attendance belongs to the authenticated user.
3. Verifies the attendance belongs to the requested store.
4. Requires approved attendance.
5. Enforces the daily spin uniqueness rule.
6. Performs weighted reward selection.
7. Creates the spin record.
8. Writes an audit event.
9. Returns the result.

---

## `signup_sales_user`

This is the backend registration path.

It validates account information and creates the authentication and sales-profile records required by the application.

---

# Signup Trigger

The signup/profile synchronization logic is defined in the database migrations.

The database trigger:

```text
handle_new_user()
```

keeps the authentication user and sales profile synchronized.

The relevant migration files include:

```text
001_initial_schema.sql
004_username_signup.sql
```

When an authentication user is created, the corresponding:

```text
public.sales
```

profile is created.

---

# Shared UI Components

Shared presentation components are located in:

```text
src/components/
```

Current shared components include:

```text
ScreenContainer
PrimaryButton
FormInput
```

These components provide reusable presentation behavior such as:

* screen spacing,
* titles and subtitles,
* button variants,
* loading states,
* consistent form input styling.

The goal is to keep route screens focused on application logic and user interaction.

---

# Services

The service layer is located in:

```text
src/services/
```

Current services include:

```text
auditService.ts
attendanceService.ts
deviceService.ts
faceDetectionService.ts
spinService.ts
storeService.ts
```

The preferred architecture is:

```text
UI
 ↓
Service
 ↓
Supabase / RPC / External Service
```

This keeps database access and backend communication out of route components wherever possible.

---

# Utilities

Validation utilities are located in:

```text
src/utils/validation.ts
```

They handle functionality such as:

* email validation,
* GPS accuracy validation,
* search query sanitization.

Distance calculations are located in:

```text
src/utils/distance.ts
```

The distance utility implements the Haversine formula and returns distances in meters.

---

# Configuration

Application configuration is handled through:

```text
src/lib/config.ts
src/lib/supabase.ts
```

The face-detection service URL uses:

```text
EXPO_PUBLIC_FACE_API_URL
```

Before using the application in another environment, verify:

* Supabase project URL,
* Supabase public/anonymous key,
* face-service URL,
* environment configuration,
* database migrations,
* Storage configuration,
* RLS policies.

**Never expose Supabase service-role credentials in the mobile application.**

---

# Version Management

Direct dependency versions are defined in:

```text
package.json
```

The exact dependency tree is recorded in:

```text
package-lock.json
```

Install exactly from the lockfile:

```bash
npm ci
```

Normal dependency installation:

```bash
npm install
```

Inspect installed top-level packages:

```bash
npm list --depth=0
```

Check the Expo project:

```bash
npx expo-doctor
```

---

# Current Version Summary

```text
Application
sales-spin-app-v2
1.0.0

Expo
54.0.36

Expo SDK
54

React
19.1.0

React DOM
19.1.0

React Native
0.81.5

Expo Router
6.0.24

TypeScript
5.9.2

Supabase JS
2.112.2

React Native Reanimated
4.1.1

React Native Screens
4.16.0

React Native Safe Area Context
5.6.1
```

---

# Current Status

## Implemented and Wired

* Auth bootstrap
* Role-based routing
* Sales sign-up flow
* Sales sign-in flow
* Sales profile loading
* Store search
* Store selection
* GPS radius verification
* Haversine distance calculation
* Camera-only attendance capture
* Face detection retry gate
* Device registration
* Audit logging
* Supabase database schema
* Row Level Security
* Private attendance photo storage
* Attendance RPC
* Spin RPC
* Attendance service
* Spin service
* Store service
* Face detection service
* Backend-controlled reward selection
* One-spin-per-store-per-day database constraint

## Scaffolded / Not Yet Fully Wired

* Final attendance submission UI
* Final attendance result UX
* Spin wheel animation
* Final spin result UX
* Attendance history UI
* Spin history UI
* Admin CRUD screens
* Admin monitoring screens
* Face matching against a sales representative's reference photo
* Reference photo enrollment
* Final production face-verification workflow

The face-matching migration is currently a draft and should not be treated as an active migration.

---

# Development Workflow

A typical development workflow is:

```text
1. Start Expo
        ↓
2. Sign in or create a sales account
        ↓
3. Select a store
        ↓
4. Verify GPS position
        ↓
5. Capture attendance photo
        ↓
6. Face detection
        ↓
7. Submit attendance
        ↓
8. Backend validates attendance
        ↓
9. Request spin
        ↓
10. Backend validates eligibility
        ↓
11. Backend selects reward
        ↓
12. Display reward
```

---

# Security Architecture

The project deliberately separates UI responsibilities from business-rule enforcement.

## Frontend Responsibilities

The frontend handles:

* navigation,
* forms,
* local validation,
* camera interaction,
* GPS acquisition,
* loading states,
* error presentation,
* displaying backend results.

## Backend Responsibilities

Supabase/database logic handles:

* authentication validation,
* authorization,
* GPS validation,
* attendance approval,
* photo requirements,
* spin eligibility,
* duplicate prevention,
* weighted reward selection,
* audit logging,
* database integrity.

The frontend should never be considered a trusted source for these decisions.

---

# Why the Code Is Structured This Way

The application separates three major concerns.

## 1. Route Screens

Route screens manage:

* navigation,
* forms,
* user interaction,
* presentation.

## 2. Contexts

Contexts manage temporary state shared between screens.

Examples:

```text
AuthContext
AttendanceFlowContext
```

## 3. Services and Database Functions

Services provide the application-facing API layer.

Database functions enforce authoritative business rules.

This separation prevents UI code from becoming responsible for:

* attendance approval,
* reward selection,
* duplicate prevention,
* authorization,
* backend validation.

---

# Architecture Overview

```text
                 ┌─────────────────────┐
                 │   Expo / React      │
                 │  Native Frontend    │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │      Services       │
                 │                     │
                 │ Auth                │
                 │ Attendance          │
                 │ Store               │
                 │ Spin                │
                 │ Audit               │
                 │ Device              │
                 │ Face Detection      │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │      Supabase       │
                 │                     │
                 │ Auth                │
                 │ PostgreSQL          │
                 │ Storage             │
                 │ RPC                 │
                 │ RLS                 │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │    Business Rules   │
                 │                     │
                 │ GPS validation      │
                 │ Attendance approval │
                 │ Spin eligibility    │
                 │ Reward selection    │
                 │ Duplicate prevention│
                 │ Audit logging       │
                 └─────────────────────┘

                 Separate Face Service
                         │
                         ▼
                 ┌─────────────────────┐
                 │     FastAPI         │
                 │     DeepFace        │
                 │     RetinaFace      │
                 └─────────────────────┘
```

---

# GPS Prototype (Development)

The login screen contains:

```text
GPS Prototype (dev)
```

This allows developers to test store-radius verification independently from the complete attendance workflow.

It can be used to verify:

* location permissions,
* current coordinates,
* GPS accuracy,
* store coordinates,
* radius configuration,
* Haversine distance behavior.

The GPS prototype is **not** the authoritative attendance approval mechanism.

---

# Database Migration Order

Database migrations are located in:

```text
supabase/migrations/
```

The active migration sequence is:

```text
001_initial_schema.sql
002_rls_policies.sql
003_storage_and_functions.sql
004_username_signup.sql
```

Apply the migrations in order when setting up a new Supabase environment.

The following file also exists:

```text
006_face_verification_draft.sql
```

This is a commented draft for future face-matching functionality.

It is **not part of the active migration sequence** and should not be applied automatically.

---

# Key Business Rules

## Attendance

```text
Authenticated user
        +
Valid store
        +
Within store radius
        +
Acceptable GPS accuracy
        +
Valid attendance photo
        =
Attendance eligible for backend approval
```

The final decision belongs to the backend.

---

## Spin

```text
Authenticated user
        +
Attendance belongs to user
        +
Attendance belongs to store
        +
Attendance approved
        +
No previous spin for same store/day
        =
Spin eligible
```

---

## Reward

```text
Server-side reward configuration
        +
Server-side weighted selection
        =
Authoritative reward
```

The mobile application must never generate the authoritative reward.

---

# Important Development Notes

## Do Not Move Business Logic Into the UI

Do not implement authoritative versions of these rules inside React Native:

* reward randomization,
* attendance approval,
* duplicate spin prevention,
* admin authorization,
* GPS approval.

The frontend may perform preliminary checks for better UX, but the backend remains authoritative.

---

## Prefer Services Over Direct Database Calls

Route components should generally use:

```text
src/services/
```

instead of calling Supabase directly.

Preferred architecture:

```text
UI
 ↓
Service
 ↓
Supabase / RPC
```

This makes the application easier to maintain and keeps backend communication consistent.

---

## Keep Database Types Updated

When the Supabase schema changes, update:

```text
src/types/database.ts
```

so the application's TypeScript database contract remains synchronized with the database.

---

# Project Structure

```text
sales-spin-app-v2/
│
├── app/
│   ├── _layout.tsx
│   ├── index.tsx
│   │
│   ├── auth/
│   │   ├── login.tsx
│   │   └── signup.tsx
│   │
│   ├── (sales)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   ├── stores.tsx
│   │   ├── history.tsx
│   │   │
│   │   ├── attendance/
│   │   │   ├── index.tsx
│   │   │   ├── camera.tsx
│   │   │   ├── preview.tsx
│   │   │   └── result.tsx
│   │   │
│   │   └── spin/
│   │       ├── index.tsx
│   │       └── result.tsx
│   │
│   └── admin/
│       ├── _layout.tsx
│       └── *.tsx
│
├── src/
│   ├── components/
│   │
│   ├── features/
│   │   ├── auth/
│   │   ├── attendance/
│   │   └── gps/
│   │
│   ├── lib/
│   │   ├── config.ts
│   │   └── supabase.ts
│   │
│   ├── services/
│   │   ├── auditService.ts
│   │   ├── attendanceService.ts
│   │   ├── deviceService.ts
│   │   ├── faceDetectionService.ts
│   │   ├── spinService.ts
│   │   └── storeService.ts
│   │
│   ├── types/
│   │   └── database.ts
│   │
│   └── utils/
│       ├── distance.ts
│       └── validation.ts
│
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql
│       ├── 002_rls_policies.sql
│       ├── 003_storage_and_functions.sql
│       ├── 004_username_signup.sql
│       └── 006_face_verification_draft.sql
│
├── face-service/
│   ├── app.py
│   ├── requirements.txt
│   └── README.md
│
├── package.json
├── package-lock.json
└── README.md
```

---

# Final Architecture Principle

The project follows one central rule:

> **The mobile application coordinates the workflow; Supabase enforces the business rules.**

The frontend is responsible for:

* collecting evidence,
* interacting with the device,
* guiding the user,
* presenting results.

The backend is responsible for determining whether an action is valid.

This separation is especially important for:

* GPS attendance,
* attendance approval,
* reward selection,
* one-spin-per-store-per-day enforcement,
* authorization,
* auditability.

Any future feature should preserve this separation.

When adding new functionality, prefer:

```text
Screen
  ↓
Feature / Context
  ↓
Service
  ↓
Supabase RPC / Database
```

rather than putting authoritative business logic directly inside the React Native screens.

[1]: https://github.com/philip696/sales_wheel/blob/backend-api/README.md "sales_wheel/README.md at backend-api · philip696/sales_wheel · GitHub"
