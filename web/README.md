# Mini NotebookLM

A web service powered by Gemini and Supabase to upload, analyze, and summarize documents (PDF, Images, Video).

## Features

- **Authentication**: Email/Password Sign Up & Sign In (Supabase).
- **File Upload**: Drag & Drop interface for various file types.
- **AI Processing**: Uses Gemini Files API for upload and Gemini 1.5 Flash for summarization.
- **History**: Saves summaries to Supabase Database for later retrieval.
- **Premium UI**: Modern dark mode design with glassmorphism effects.

## Setup

1. **Install Dependencies**:

   ```bash
   npm install
   ```

2. **Environment Variables**:
   Check `.env.local` and ensure the following are set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY` (Get this from Google AI Studio)

3. **Database**:
   The `summaries` table should be created in your Supabase project.
   SQL Schema:
   ```sql
   create table summaries (
     id uuid default gen_random_uuid() primary key,
     user_id uuid references auth.users not null,
     file_name text not null,
     file_type text,
     summary text not null,
     created_at timestamp with time zone default timezone('utc'::text, now()) not null
   );
   ```

## Running Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.
