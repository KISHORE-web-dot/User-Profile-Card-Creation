from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, HttpUrl
from typing import Optional
from datetime import datetime

app = FastAPI(title="User Profile Card API", version="1.0.0")

# Enable CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store for generated profile cards
profile_cards: list[dict] = []
card_id_counter = 1

# --- PYDANTIC SCHEMAS ---

class ProfileCardInput(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Full name of the user")
    title: Optional[str] = Field("", max_length=100, description="Job title or role")
    bio: str = Field(..., min_length=1, max_length=500, description="Short biography")
    image_url: Optional[str] = Field("", description="Profile picture URL")
    location: Optional[str] = Field("", max_length=100, description="City, Country")
    email: Optional[str] = Field("", max_length=150, description="Contact email")
    website: Optional[str] = Field("", max_length=200, description="Personal website or portfolio URL")
    twitter: Optional[str] = Field("", max_length=50, description="Twitter/X handle (without @)")
    github: Optional[str] = Field("", max_length=50, description="GitHub username")
    skills: Optional[str] = Field("", description="Comma-separated list of skills")
    theme: Optional[str] = Field("purple", description="Card color theme: purple, ocean, sunset, forest, midnight")

class ProfileCardResponse(BaseModel):
    id: int
    name: str
    title: str
    bio: str
    image_url: str
    location: str
    email: str
    website: str
    twitter: str
    github: str
    skills: list[str]
    theme: str
    created_at: str
    initials: str

def get_initials(name: str) -> str:
    """Extract initials from a name string."""
    parts = name.strip().split()
    if len(parts) >= 2:
        return (parts[0][0] + parts[-1][0]).upper()
    elif len(parts) == 1 and len(parts[0]) >= 1:
        return parts[0][0].upper()
    return "?"

# --- API ENDPOINTS ---

@app.get("/")
def read_root():
    return {"message": "Welcome to the User Profile Card API. Visit /docs for documentation."}

@app.post("/api/profile", response_model=ProfileCardResponse, status_code=status.HTTP_201_CREATED)
def create_profile_card(data: ProfileCardInput):
    """
    Accepts user profile data via POST request and returns a fully
    formatted profile card object ready for the frontend to render.
    """
    global card_id_counter

    # Parse skills into a clean list
    skills_list = []
    if data.skills:
        skills_list = [s.strip() for s in data.skills.split(",") if s.strip()]

    card = {
        "id": card_id_counter,
        "name": data.name.strip(),
        "title": data.title.strip() if data.title else "",
        "bio": data.bio.strip(),
        "image_url": data.image_url.strip() if data.image_url else "",
        "location": data.location.strip() if data.location else "",
        "email": data.email.strip() if data.email else "",
        "website": data.website.strip() if data.website else "",
        "twitter": data.twitter.strip().lstrip("@") if data.twitter else "",
        "github": data.github.strip() if data.github else "",
        "skills": skills_list,
        "theme": data.theme if data.theme in ["purple", "ocean", "sunset", "forest", "midnight"] else "purple",
        "created_at": datetime.utcnow().isoformat() + "Z",
        "initials": get_initials(data.name),
    }

    profile_cards.append(card)
    card_id_counter += 1
    return card

@app.get("/api/profiles", response_model=list[ProfileCardResponse])
def get_all_profiles():
    """Return all generated profile cards."""
    return list(reversed(profile_cards))

@app.delete("/api/profile/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_profile_card(card_id: int):
    """Delete a profile card by ID."""
    global profile_cards
    original_length = len(profile_cards)
    profile_cards = [c for c in profile_cards if c["id"] != card_id]
    if len(profile_cards) == original_length:
        raise HTTPException(status_code=404, detail=f"Profile card with ID {card_id} not found.")
    return None
