"""
Recording Storage Service
Simple service to store and serve audio recordings from meetings
"""
import os
from pathlib import Path
from typing import List, Optional
from datetime import datetime

from fastapi import FastAPI, HTTPException, Header, Depends, UploadFile, File
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, select, and_
from sqlalchemy.orm import Session, sessionmaker
from pydantic import BaseModel
import logging
import glob
import shutil
import subprocess
import aiofiles

# Import shared models
from shared_models.models import User, APIToken, Meeting

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Environment configuration
DB_HOST = os.getenv("DB_HOST", "postgres")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "vexa")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")
RECORDINGS_DIR = Path(os.getenv("RECORDINGS_DIR", "/recordings"))

# Ensure recordings directory exists
RECORDINGS_DIR.mkdir(parents=True, exist_ok=True)

# Database setup
DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# FastAPI app
app = FastAPI(
    title="Vexa Recording Storage",
    description="Service for storing and retrieving meeting audio recordings",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class RecordingInfo(BaseModel):
    platform: str
    native_meeting_id: str
    filename: str
    file_size: int
    duration_seconds: Optional[int] = None
    created_at: datetime
    meeting_status: str

class RecordingListResponse(BaseModel):
    recordings: List[RecordingInfo]
    total: int

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Dependency to authenticate user via API key
async def get_current_user(
    x_api_key: str = Header(..., alias="X-API-Key"),
    db: Session = Depends(get_db)
) -> User:
    """Authenticate user via API key"""
    token = db.execute(
        select(APIToken).where(APIToken.token == x_api_key)
    ).scalar_one_or_none()

    if not token:
        raise HTTPException(status_code=401, detail="Invalid API key")

    user = db.execute(
        select(User).where(User.id == token.user_id)
    ).scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user

def find_recording_file(platform: str, native_meeting_id: str) -> Optional[Path]:
    """Find recording file for a meeting"""
    # Recordings are named: {native_meeting_id}_{timestamp}.webm
    pattern = f"{native_meeting_id}_*.webm"
    matches = list(RECORDINGS_DIR.glob(pattern))

    if matches:
        # Return the most recent if multiple exist
        return sorted(matches, key=lambda p: p.stat().st_mtime, reverse=True)[0]

    return None

@app.get("/", tags=["General"])
async def root():
    """Root endpoint"""
    return {
        "service": "recording-storage",
        "version": "1.0.0",
        "recordings_dir": str(RECORDINGS_DIR)
    }

@app.get("/health", tags=["General"])
async def health():
    """Health check endpoint"""
    return {"status": "healthy"}

@app.get("/recordings", response_model=RecordingListResponse, tags=["Recordings"])
async def list_recordings(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all recordings for the authenticated user"""
    # Get user's meetings
    meetings = db.execute(
        select(Meeting)
        .where(Meeting.user_id == user.id)
        .order_by(Meeting.created_at.desc())
    ).scalars().all()

    recordings = []
    for meeting in meetings:
        # Check if recording file exists
        recording_file = find_recording_file(meeting.platform, meeting.native_meeting_id)

        if recording_file:
            stat = recording_file.stat()
            recordings.append(RecordingInfo(
                platform=meeting.platform,
                native_meeting_id=meeting.native_meeting_id,
                filename=recording_file.name,
                file_size=stat.st_size,
                duration_seconds=None,  # Could be calculated from file metadata
                created_at=meeting.created_at,
                meeting_status=meeting.status
            ))

    return RecordingListResponse(
        recordings=recordings,
        total=len(recordings)
    )

@app.get("/recordings/{platform}/{native_meeting_id}", tags=["Recordings"])
async def download_recording(
    platform: str,
    native_meeting_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download audio recording for a specific meeting"""
    # Verify meeting belongs to user (get most recent if multiple exist)
    meeting = db.execute(
        select(Meeting).where(
            and_(
                Meeting.user_id == user.id,
                Meeting.platform == platform,
                Meeting.platform_specific_id == native_meeting_id
            )
        ).order_by(Meeting.created_at.desc())
    ).scalars().first()

    if not meeting:
        raise HTTPException(
            status_code=404,
            detail=f"Meeting not found for platform={platform}, id={native_meeting_id}"
        )

    # Find recording file
    recording_file = find_recording_file(platform, native_meeting_id)

    if not recording_file or not recording_file.exists():
        raise HTTPException(
            status_code=404,
            detail="Recording file not found"
        )

    # Return file for download
    return FileResponse(
        path=recording_file,
        media_type="audio/webm",
        filename=recording_file.name
    )

@app.delete("/recordings/{platform}/{native_meeting_id}", tags=["Recordings"])
async def delete_recording(
    platform: str,
    native_meeting_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete audio recording for a specific meeting"""
    # Verify meeting belongs to user (get most recent if multiple exist)
    meeting = db.execute(
        select(Meeting).where(
            and_(
                Meeting.user_id == user.id,
                Meeting.platform == platform,
                Meeting.platform_specific_id == native_meeting_id
            )
        ).order_by(Meeting.created_at.desc())
    ).scalars().first()

    if not meeting:
        raise HTTPException(
            status_code=404,
            detail=f"Meeting not found"
        )

    # Find and delete recording file
    recording_file = find_recording_file(platform, native_meeting_id)

    if recording_file and recording_file.exists():
        recording_file.unlink()
        logger.info(f"Deleted recording: {recording_file}")
        return {"message": "Recording deleted successfully"}
    else:
        raise HTTPException(
            status_code=404,
            detail="Recording file not found"
        )


@app.post("/stream", tags=["Recordings"])
async def stream_chunk(
    meeting_id: str = Header(..., alias="X-Meeting-ID"),
    chunk_index: int = Header(..., alias="X-Chunk-Index"),
    file: UploadFile = File(...)
):
    """
    Receive and save audio chunk during recording.
    Chunks are saved to temporary directory and concatenated on finalize.
    """
    try:
        # Create temp directory for this meeting
        temp_dir = RECORDINGS_DIR / "temp" / meeting_id
        temp_dir.mkdir(parents=True, exist_ok=True)
        
        # Save chunk
        chunk_path = temp_dir / f"chunk_{chunk_index:05d}.webm"
        
        # Read file content
        content = await file.read()
        
        # Write chunk atomically
        async with aiofiles.open(chunk_path, 'wb') as f:
            await f.write(content)
            await f.flush()  # Ensure data is written to disk
        
        # Verify chunk was written correctly
        if not chunk_path.exists() or chunk_path.stat().st_size != len(content):
            logger.error(f"Chunk {chunk_index} verification failed!")
            raise HTTPException(status_code=500, detail="Chunk write verification failed")
        
        logger.info(f"Saved chunk {chunk_index} for meeting {meeting_id} ({len(content)} bytes)")
        
        return {
            "status": "ok",
            "meeting_id": meeting_id,
            "chunk_index": chunk_index,
            "size": len(content)
        }
    
    except Exception as e:
        logger.error(f"Error saving chunk {chunk_index} for meeting {meeting_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/finalize/{meeting_id}", tags=["Recordings"])
async def finalize_recording(meeting_id: str):
    """
    Concatenate all chunks into final recording file.
    Uses ffmpeg to merge chunks without re-encoding.
    """
    try:
        temp_dir = RECORDINGS_DIR / "temp" / meeting_id
        
        if not temp_dir.exists():
            raise HTTPException(
                status_code=404,
                detail=f"No chunks found for meeting {meeting_id}"
            )
        
        # Find all chunks
        chunks = sorted(glob.glob(str(temp_dir / "chunk_*.webm")))
        
        if not chunks:
            raise HTTPException(
                status_code=404,
                detail=f"No chunks found in {temp_dir}"
            )
        
        logger.info(f"Finalizing recording for {meeting_id} with {len(chunks)} chunks")
        
        # Create list file for ffmpeg
        list_file = temp_dir / "list.txt"
        with open(list_file, 'w') as f:
            for chunk in chunks:
                # ffmpeg requires absolute paths
                f.write(f"file '{chunk}'\n")
        
        # Log list file content for debugging
        with open(list_file, 'r') as f:
            list_content = f.read()
            logger.info(f"FFmpeg concat list:\n{list_content}")
        
        # Generate final filename
        timestamp = datetime.now().strftime('%Y-%m-%dT%H-%M-%S-%f')[:-3] + 'Z'
        final_filename = f"{meeting_id}_{timestamp}.webm"
        final_path = RECORDINGS_DIR / final_filename
        
        # Concatenate with ffmpeg
        # IMPORTANT: MediaRecorder with timeslice creates chunks that need remuxing
        # We use concat protocol (not concat demuxer) which handles fragmented WebM
        logger.info(f"Running ffmpeg concat for {len(chunks)} chunks...")

        # Build concat input string: "concat:chunk1|chunk2|chunk3"
        concat_input = "concat:" + "|".join(chunks)

        result = subprocess.run([
            "ffmpeg",
            "-i", concat_input,
            "-c", "copy",
            str(final_path)
        ], capture_output=True, text=True, check=True)
        
        logger.info(f"FFmpeg stdout: {result.stdout}")
        if result.stderr:
            logger.info(f"FFmpeg stderr: {result.stderr}")
        
        # Clean up temp directory
        shutil.rmtree(temp_dir)
        
        logger.info(f"Finalized recording: {final_filename}")
        
        return {
            "status": "ok",
            "meeting_id": meeting_id,
            "filename": final_filename,
            "chunks_merged": len(chunks),
            "file_size": final_path.stat().st_size
        }
    
    except subprocess.CalledProcessError as e:
        logger.error(f"ffmpeg error for {meeting_id}: {e.stderr}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to concatenate chunks: {e.stderr}"
        )
    except Exception as e:
        logger.error(f"Error finalizing recording for {meeting_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
