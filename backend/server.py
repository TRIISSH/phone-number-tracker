from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import httpx
import phonenumbers
from phonenumbers import carrier, geocoder, timezone as phone_timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="NetStalker - Educational Cybersecurity Platform")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ==================== Models ====================

class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Phone Lookup Models
class PhoneLookupRequest(BaseModel):
    phone_number: str = Field(..., min_length=5, max_length=20)
    country_code: Optional[str] = None

class CarrierInfo(BaseModel):
    name: str
    line_type: str

class PhoneLocation(BaseModel):
    country: str
    country_code: str
    region: Optional[str] = None
    city: Optional[str] = None
    timezone: Optional[List[str]] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    telecom_circle: Optional[str] = None

class PhoneLookupResponse(BaseModel):
    valid: bool
    phone_number: str
    formatted_national: Optional[str] = None
    formatted_international: Optional[str] = None
    country_code: Optional[str] = None
    carrier: Optional[CarrierInfo] = None
    location: Optional[PhoneLocation] = None
    number_type: Optional[str] = None

# IP Lookup Models
class IPLookupRequest(BaseModel):
    ip_address: str

class GeoLocation(BaseModel):
    country: str
    country_code: str
    region: Optional[str] = None
    region_name: Optional[str] = None
    city: Optional[str] = None
    zip_code: Optional[str] = None
    latitude: float
    longitude: float
    timezone: Optional[str] = None

class IPLookupResponse(BaseModel):
    success: bool
    ip_address: str
    location: Optional[GeoLocation] = None
    isp: Optional[str] = None
    org: Optional[str] = None
    as_info: Optional[str] = None
    is_mobile: bool = False
    is_proxy: bool = False
    is_hosting: bool = False

# Lookup History
class LookupHistory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    lookup_type: str  # "phone" or "ip"
    query: str
    result_summary: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== Phone Number Utilities ====================

def get_number_type_string(num_type: int) -> str:
    type_map = {
        0: "FIXED_LINE",
        1: "MOBILE",
        2: "FIXED_LINE_OR_MOBILE",
        3: "TOLL_FREE",
        4: "PREMIUM_RATE",
        5: "SHARED_COST",
        6: "VOIP",
        7: "PERSONAL_NUMBER",
        8: "PAGER",
        9: "UAN",
        10: "VOICEMAIL",
        99: "UNKNOWN"
    }
    return type_map.get(num_type, "UNKNOWN")

# Country coordinates (capital cities as approximate center)
COUNTRY_COORDINATES = {
    "IN": {"lat": 28.6139, "lon": 77.2090, "city": "New Delhi"},  # India
    "US": {"lat": 38.9072, "lon": -77.0369, "city": "Washington D.C."},  # USA
    "GB": {"lat": 51.5074, "lon": -0.1278, "city": "London"},  # UK
    "DE": {"lat": 52.5200, "lon": 13.4050, "city": "Berlin"},  # Germany
    "FR": {"lat": 48.8566, "lon": 2.3522, "city": "Paris"},  # France
    "JP": {"lat": 35.6762, "lon": 139.6503, "city": "Tokyo"},  # Japan
    "CN": {"lat": 39.9042, "lon": 116.4074, "city": "Beijing"},  # China
    "AU": {"lat": -35.2809, "lon": 149.1300, "city": "Canberra"},  # Australia
    "CA": {"lat": 45.4215, "lon": -75.6972, "city": "Ottawa"},  # Canada
    "BR": {"lat": -15.7975, "lon": -47.8919, "city": "Brasília"},  # Brazil
    "RU": {"lat": 55.7558, "lon": 37.6173, "city": "Moscow"},  # Russia
    "IT": {"lat": 41.9028, "lon": 12.4964, "city": "Rome"},  # Italy
    "ES": {"lat": 40.4168, "lon": -3.7038, "city": "Madrid"},  # Spain
    "MX": {"lat": 19.4326, "lon": -99.1332, "city": "Mexico City"},  # Mexico
    "KR": {"lat": 37.5665, "lon": 126.9780, "city": "Seoul"},  # South Korea
    "SA": {"lat": 24.7136, "lon": 46.6753, "city": "Riyadh"},  # Saudi Arabia
    "AE": {"lat": 24.4539, "lon": 54.3773, "city": "Abu Dhabi"},  # UAE
    "SG": {"lat": 1.3521, "lon": 103.8198, "city": "Singapore"},  # Singapore
    "NL": {"lat": 52.3676, "lon": 4.9041, "city": "Amsterdam"},  # Netherlands
    "CH": {"lat": 46.9480, "lon": 7.4474, "city": "Bern"},  # Switzerland
    "SE": {"lat": 59.3293, "lon": 18.0686, "city": "Stockholm"},  # Sweden
    "PL": {"lat": 52.2297, "lon": 21.0122, "city": "Warsaw"},  # Poland
    "TH": {"lat": 13.7563, "lon": 100.5018, "city": "Bangkok"},  # Thailand
    "ID": {"lat": -6.2088, "lon": 106.8456, "city": "Jakarta"},  # Indonesia
    "PH": {"lat": 14.5995, "lon": 120.9842, "city": "Manila"},  # Philippines
    "MY": {"lat": 3.1390, "lon": 101.6869, "city": "Kuala Lumpur"},  # Malaysia
    "VN": {"lat": 21.0285, "lon": 105.8542, "city": "Hanoi"},  # Vietnam
    "PK": {"lat": 33.6844, "lon": 73.0479, "city": "Islamabad"},  # Pakistan
    "BD": {"lat": 23.8103, "lon": 90.4125, "city": "Dhaka"},  # Bangladesh
    "NG": {"lat": 9.0765, "lon": 7.3986, "city": "Abuja"},  # Nigeria
    "EG": {"lat": 30.0444, "lon": 31.2357, "city": "Cairo"},  # Egypt
    "ZA": {"lat": -25.7479, "lon": 28.2293, "city": "Pretoria"},  # South Africa
    "KE": {"lat": -1.2921, "lon": 36.8219, "city": "Nairobi"},  # Kenya
    "TR": {"lat": 39.9334, "lon": 32.8597, "city": "Ankara"},  # Turkey
    "IL": {"lat": 31.7683, "lon": 35.2137, "city": "Jerusalem"},  # Israel
    "AR": {"lat": -34.6037, "lon": -58.3816, "city": "Buenos Aires"},  # Argentina
    "CL": {"lat": -33.4489, "lon": -70.6693, "city": "Santiago"},  # Chile
    "CO": {"lat": 4.7110, "lon": -74.0721, "city": "Bogotá"},  # Colombia
    "NZ": {"lat": -41.2865, "lon": 174.7762, "city": "Wellington"},  # New Zealand
    "IE": {"lat": 53.3498, "lon": -6.2603, "city": "Dublin"},  # Ireland
    "PT": {"lat": 38.7223, "lon": -9.1393, "city": "Lisbon"},  # Portugal
    "GR": {"lat": 37.9838, "lon": 23.7275, "city": "Athens"},  # Greece
    "AT": {"lat": 48.2082, "lon": 16.3738, "city": "Vienna"},  # Austria
    "BE": {"lat": 50.8503, "lon": 4.3517, "city": "Brussels"},  # Belgium
    "DK": {"lat": 55.6761, "lon": 12.5683, "city": "Copenhagen"},  # Denmark
    "FI": {"lat": 60.1699, "lon": 24.9384, "city": "Helsinki"},  # Finland
    "NO": {"lat": 59.9139, "lon": 10.7522, "city": "Oslo"},  # Norway
    "CZ": {"lat": 50.0755, "lon": 14.4378, "city": "Prague"},  # Czech Republic
    "HU": {"lat": 47.4979, "lon": 19.0402, "city": "Budapest"},  # Hungary
    "RO": {"lat": 44.4268, "lon": 26.1025, "city": "Bucharest"},  # Romania
    "UA": {"lat": 50.4501, "lon": 30.5234, "city": "Kyiv"},  # Ukraine
}

# Indian Telecom Circles with coordinates (most accurate legal location for Indian mobile numbers)
INDIAN_TELECOM_CIRCLES = {
    # Mobile prefixes mapped to telecom circles
    "70": {"circle": "Pan India", "lat": 28.6139, "lon": 77.2090, "city": "Delhi NCR"},
    "71": {"circle": "Pan India", "lat": 28.6139, "lon": 77.2090, "city": "Delhi NCR"},
    "72": {"circle": "Pan India", "lat": 28.6139, "lon": 77.2090, "city": "Delhi NCR"},
    "73": {"circle": "Pan India", "lat": 28.6139, "lon": 77.2090, "city": "Delhi NCR"},
    "74": {"circle": "Pan India", "lat": 28.6139, "lon": 77.2090, "city": "Delhi NCR"},
    "75": {"circle": "Pan India", "lat": 28.6139, "lon": 77.2090, "city": "Delhi NCR"},
    "76": {"circle": "Pan India", "lat": 28.6139, "lon": 77.2090, "city": "Delhi NCR"},
    "77": {"circle": "Pan India", "lat": 28.6139, "lon": 77.2090, "city": "Delhi NCR"},
    "78": {"circle": "Pan India", "lat": 28.6139, "lon": 77.2090, "city": "Delhi NCR"},
    "79": {"circle": "Pan India", "lat": 23.0225, "lon": 72.5714, "city": "Gujarat"},
    
    # Airtel prefixes by circle
    "98100": {"circle": "Delhi", "lat": 28.6139, "lon": 77.2090, "city": "New Delhi"},
    "98101": {"circle": "Delhi", "lat": 28.6139, "lon": 77.2090, "city": "New Delhi"},
    "98102": {"circle": "Delhi", "lat": 28.6139, "lon": 77.2090, "city": "New Delhi"},
    "98103": {"circle": "Delhi", "lat": 28.6139, "lon": 77.2090, "city": "New Delhi"},
    "98104": {"circle": "Delhi", "lat": 28.6139, "lon": 77.2090, "city": "New Delhi"},
    "98110": {"circle": "Delhi", "lat": 28.6139, "lon": 77.2090, "city": "New Delhi"},
    "98111": {"circle": "Delhi", "lat": 28.6139, "lon": 77.2090, "city": "New Delhi"},
    "98112": {"circle": "Delhi", "lat": 28.6139, "lon": 77.2090, "city": "New Delhi"},
    
    "98200": {"circle": "Mumbai", "lat": 19.0760, "lon": 72.8777, "city": "Mumbai"},
    "98201": {"circle": "Mumbai", "lat": 19.0760, "lon": 72.8777, "city": "Mumbai"},
    "98202": {"circle": "Mumbai", "lat": 19.0760, "lon": 72.8777, "city": "Mumbai"},
    "98203": {"circle": "Mumbai", "lat": 19.0760, "lon": 72.8777, "city": "Mumbai"},
    "98204": {"circle": "Mumbai", "lat": 19.0760, "lon": 72.8777, "city": "Mumbai"},
    "98205": {"circle": "Mumbai", "lat": 19.0760, "lon": 72.8777, "city": "Mumbai"},
    "98206": {"circle": "Mumbai", "lat": 19.0760, "lon": 72.8777, "city": "Mumbai"},
    "98207": {"circle": "Mumbai", "lat": 19.0760, "lon": 72.8777, "city": "Mumbai"},
    "98208": {"circle": "Mumbai", "lat": 19.0760, "lon": 72.8777, "city": "Mumbai"},
    "98209": {"circle": "Mumbai", "lat": 19.0760, "lon": 72.8777, "city": "Mumbai"},
    "98210": {"circle": "Mumbai", "lat": 19.0760, "lon": 72.8777, "city": "Mumbai"},
    "98211": {"circle": "Mumbai", "lat": 19.0760, "lon": 72.8777, "city": "Mumbai"},
    "98212": {"circle": "Mumbai", "lat": 19.0760, "lon": 72.8777, "city": "Mumbai"},
    "98213": {"circle": "Mumbai", "lat": 19.0760, "lon": 72.8777, "city": "Mumbai"},
    "98214": {"circle": "Mumbai", "lat": 19.0760, "lon": 72.8777, "city": "Mumbai"},
    
    "98300": {"circle": "Kolkata", "lat": 22.5726, "lon": 88.3639, "city": "Kolkata"},
    "98301": {"circle": "Kolkata", "lat": 22.5726, "lon": 88.3639, "city": "Kolkata"},
    "98302": {"circle": "Kolkata", "lat": 22.5726, "lon": 88.3639, "city": "Kolkata"},
    "98303": {"circle": "Kolkata", "lat": 22.5726, "lon": 88.3639, "city": "Kolkata"},
    "98304": {"circle": "Kolkata", "lat": 22.5726, "lon": 88.3639, "city": "Kolkata"},
    "98305": {"circle": "Kolkata", "lat": 22.5726, "lon": 88.3639, "city": "Kolkata"},
    
    "98400": {"circle": "Chennai", "lat": 13.0827, "lon": 80.2707, "city": "Chennai"},
    "98401": {"circle": "Chennai", "lat": 13.0827, "lon": 80.2707, "city": "Chennai"},
    "98402": {"circle": "Chennai", "lat": 13.0827, "lon": 80.2707, "city": "Chennai"},
    "98403": {"circle": "Chennai", "lat": 13.0827, "lon": 80.2707, "city": "Chennai"},
    "98404": {"circle": "Chennai", "lat": 13.0827, "lon": 80.2707, "city": "Chennai"},
    "98405": {"circle": "Chennai", "lat": 13.0827, "lon": 80.2707, "city": "Chennai"},
    "98406": {"circle": "Chennai", "lat": 13.0827, "lon": 80.2707, "city": "Chennai"},
    "98407": {"circle": "Chennai", "lat": 13.0827, "lon": 80.2707, "city": "Chennai"},
    "98408": {"circle": "Chennai", "lat": 13.0827, "lon": 80.2707, "city": "Chennai"},
    "98409": {"circle": "Chennai", "lat": 13.0827, "lon": 80.2707, "city": "Chennai"},
    "98410": {"circle": "Chennai", "lat": 13.0827, "lon": 80.2707, "city": "Chennai"},
    "98411": {"circle": "Chennai", "lat": 13.0827, "lon": 80.2707, "city": "Chennai"},
    "98412": {"circle": "Chennai", "lat": 13.0827, "lon": 80.2707, "city": "Chennai"},
    "98413": {"circle": "Chennai", "lat": 13.0827, "lon": 80.2707, "city": "Chennai"},
    "98414": {"circle": "Chennai", "lat": 13.0827, "lon": 80.2707, "city": "Chennai"},
    
    "98440": {"circle": "Karnataka", "lat": 12.9716, "lon": 77.5946, "city": "Bangalore"},
    "98441": {"circle": "Karnataka", "lat": 12.9716, "lon": 77.5946, "city": "Bangalore"},
    "98442": {"circle": "Karnataka", "lat": 12.9716, "lon": 77.5946, "city": "Bangalore"},
    "98443": {"circle": "Karnataka", "lat": 12.9716, "lon": 77.5946, "city": "Bangalore"},
    "98444": {"circle": "Karnataka", "lat": 12.9716, "lon": 77.5946, "city": "Bangalore"},
    "98445": {"circle": "Karnataka", "lat": 12.9716, "lon": 77.5946, "city": "Bangalore"},
    "98446": {"circle": "Karnataka", "lat": 12.9716, "lon": 77.5946, "city": "Bangalore"},
    "98447": {"circle": "Karnataka", "lat": 12.9716, "lon": 77.5946, "city": "Bangalore"},
    "98448": {"circle": "Karnataka", "lat": 12.9716, "lon": 77.5946, "city": "Bangalore"},
    "98449": {"circle": "Karnataka", "lat": 12.9716, "lon": 77.5946, "city": "Bangalore"},
    "98450": {"circle": "Karnataka", "lat": 12.9716, "lon": 77.5946, "city": "Bangalore"},
    "98451": {"circle": "Karnataka", "lat": 12.9716, "lon": 77.5946, "city": "Bangalore"},
    "98452": {"circle": "Karnataka", "lat": 12.9716, "lon": 77.5946, "city": "Bangalore"},
    
    "98490": {"circle": "Andhra Pradesh", "lat": 17.3850, "lon": 78.4867, "city": "Hyderabad"},
    "98491": {"circle": "Andhra Pradesh", "lat": 17.3850, "lon": 78.4867, "city": "Hyderabad"},
    "98492": {"circle": "Andhra Pradesh", "lat": 17.3850, "lon": 78.4867, "city": "Hyderabad"},
    "98493": {"circle": "Andhra Pradesh", "lat": 17.3850, "lon": 78.4867, "city": "Hyderabad"},
    "98494": {"circle": "Andhra Pradesh", "lat": 17.3850, "lon": 78.4867, "city": "Hyderabad"},
    "98495": {"circle": "Andhra Pradesh", "lat": 17.3850, "lon": 78.4867, "city": "Hyderabad"},
    
    "98500": {"circle": "Gujarat", "lat": 23.0225, "lon": 72.5714, "city": "Ahmedabad"},
    "98501": {"circle": "Gujarat", "lat": 23.0225, "lon": 72.5714, "city": "Ahmedabad"},
    "98502": {"circle": "Gujarat", "lat": 23.0225, "lon": 72.5714, "city": "Ahmedabad"},
    "98503": {"circle": "Gujarat", "lat": 23.0225, "lon": 72.5714, "city": "Ahmedabad"},
    "98504": {"circle": "Gujarat", "lat": 23.0225, "lon": 72.5714, "city": "Ahmedabad"},
    "98505": {"circle": "Gujarat", "lat": 23.0225, "lon": 72.5714, "city": "Ahmedabad"},
    
    "98600": {"circle": "Maharashtra", "lat": 18.5204, "lon": 73.8567, "city": "Pune"},
    "98601": {"circle": "Maharashtra", "lat": 18.5204, "lon": 73.8567, "city": "Pune"},
    "98602": {"circle": "Maharashtra", "lat": 18.5204, "lon": 73.8567, "city": "Pune"},
    "98603": {"circle": "Maharashtra", "lat": 18.5204, "lon": 73.8567, "city": "Pune"},
    
    "98700": {"circle": "Punjab", "lat": 30.7333, "lon": 76.7794, "city": "Chandigarh"},
    "98701": {"circle": "Punjab", "lat": 30.7333, "lon": 76.7794, "city": "Chandigarh"},
    "98702": {"circle": "Punjab", "lat": 30.7333, "lon": 76.7794, "city": "Chandigarh"},
    "98703": {"circle": "Punjab", "lat": 30.7333, "lon": 76.7794, "city": "Chandigarh"},
    
    "98710": {"circle": "Haryana", "lat": 28.4595, "lon": 77.0266, "city": "Gurgaon"},
    "98711": {"circle": "Haryana", "lat": 28.4595, "lon": 77.0266, "city": "Gurgaon"},
    "98712": {"circle": "Haryana", "lat": 28.4595, "lon": 77.0266, "city": "Gurgaon"},
    "98713": {"circle": "Haryana", "lat": 28.4595, "lon": 77.0266, "city": "Gurgaon"},
    
    "98720": {"circle": "Rajasthan", "lat": 26.9124, "lon": 75.7873, "city": "Jaipur"},
    "98721": {"circle": "Rajasthan", "lat": 26.9124, "lon": 75.7873, "city": "Jaipur"},
    "98722": {"circle": "Rajasthan", "lat": 26.9124, "lon": 75.7873, "city": "Jaipur"},
    "98723": {"circle": "Rajasthan", "lat": 26.9124, "lon": 75.7873, "city": "Jaipur"},
    "98724": {"circle": "Rajasthan", "lat": 26.9124, "lon": 75.7873, "city": "Jaipur"},
    "98725": {"circle": "Rajasthan", "lat": 26.9124, "lon": 75.7873, "city": "Jaipur"},
    "98726": {"circle": "Rajasthan", "lat": 26.9124, "lon": 75.7873, "city": "Jaipur"},
    "98727": {"circle": "Rajasthan", "lat": 26.9124, "lon": 75.7873, "city": "Jaipur"},
    "98728": {"circle": "Rajasthan", "lat": 26.9124, "lon": 75.7873, "city": "Jaipur"},
    "98729": {"circle": "Rajasthan", "lat": 26.9124, "lon": 75.7873, "city": "Jaipur"},
    
    "98760": {"circle": "Uttar Pradesh East", "lat": 26.8467, "lon": 80.9462, "city": "Lucknow"},
    "98761": {"circle": "Uttar Pradesh East", "lat": 26.8467, "lon": 80.9462, "city": "Lucknow"},
    "98762": {"circle": "Uttar Pradesh East", "lat": 26.8467, "lon": 80.9462, "city": "Lucknow"},
    "98763": {"circle": "Uttar Pradesh East", "lat": 26.8467, "lon": 80.9462, "city": "Lucknow"},
    "98764": {"circle": "Uttar Pradesh East", "lat": 26.8467, "lon": 80.9462, "city": "Lucknow"},
    "98765": {"circle": "Uttar Pradesh East", "lat": 26.8467, "lon": 80.9462, "city": "Lucknow"},
    
    "98800": {"circle": "Kerala", "lat": 8.5241, "lon": 76.9366, "city": "Thiruvananthapuram"},
    "98801": {"circle": "Kerala", "lat": 8.5241, "lon": 76.9366, "city": "Thiruvananthapuram"},
    "98802": {"circle": "Kerala", "lat": 8.5241, "lon": 76.9366, "city": "Thiruvananthapuram"},
    "98803": {"circle": "Kerala", "lat": 8.5241, "lon": 76.9366, "city": "Thiruvananthapuram"},
    "98804": {"circle": "Kerala", "lat": 8.5241, "lon": 76.9366, "city": "Thiruvananthapuram"},
    "98805": {"circle": "Kerala", "lat": 8.5241, "lon": 76.9366, "city": "Thiruvananthapuram"},
    "98806": {"circle": "Kerala", "lat": 8.5241, "lon": 76.9366, "city": "Thiruvananthapuram"},
    "98807": {"circle": "Kerala", "lat": 8.5241, "lon": 76.9366, "city": "Thiruvananthapuram"},
    "98808": {"circle": "Kerala", "lat": 8.5241, "lon": 76.9366, "city": "Thiruvananthapuram"},
    "98809": {"circle": "Kerala", "lat": 8.5241, "lon": 76.9366, "city": "Thiruvananthapuram"},
    "98810": {"circle": "Kerala", "lat": 10.8505, "lon": 76.2711, "city": "Palakkad"},
    "98811": {"circle": "Kerala", "lat": 9.9312, "lon": 76.2673, "city": "Kochi"},
    "98812": {"circle": "Kerala", "lat": 9.9312, "lon": 76.2673, "city": "Kochi"},
    
    "98900": {"circle": "Tamil Nadu", "lat": 11.0168, "lon": 76.9558, "city": "Coimbatore"},
    "98901": {"circle": "Tamil Nadu", "lat": 11.0168, "lon": 76.9558, "city": "Coimbatore"},
    "98902": {"circle": "Tamil Nadu", "lat": 11.0168, "lon": 76.9558, "city": "Coimbatore"},
    "98903": {"circle": "Tamil Nadu", "lat": 9.9252, "lon": 78.1198, "city": "Madurai"},
    "98904": {"circle": "Tamil Nadu", "lat": 9.9252, "lon": 78.1198, "city": "Madurai"},
    "98905": {"circle": "Tamil Nadu", "lat": 10.7905, "lon": 78.7047, "city": "Trichy"},
    "98906": {"circle": "Tamil Nadu", "lat": 10.7905, "lon": 78.7047, "city": "Trichy"},
    
    "99000": {"circle": "West Bengal", "lat": 22.5726, "lon": 88.3639, "city": "Kolkata"},
    "99001": {"circle": "West Bengal", "lat": 22.5726, "lon": 88.3639, "city": "Kolkata"},
    "99002": {"circle": "West Bengal", "lat": 22.5726, "lon": 88.3639, "city": "Kolkata"},
    "99003": {"circle": "West Bengal", "lat": 22.5726, "lon": 88.3639, "city": "Kolkata"},
    
    "99100": {"circle": "Bihar", "lat": 25.5941, "lon": 85.1376, "city": "Patna"},
    "99101": {"circle": "Bihar", "lat": 25.5941, "lon": 85.1376, "city": "Patna"},
    "99102": {"circle": "Bihar", "lat": 25.5941, "lon": 85.1376, "city": "Patna"},
    "99103": {"circle": "Bihar", "lat": 25.5941, "lon": 85.1376, "city": "Patna"},
    "99104": {"circle": "Bihar", "lat": 25.5941, "lon": 85.1376, "city": "Patna"},
    
    "99200": {"circle": "Odisha", "lat": 20.2961, "lon": 85.8245, "city": "Bhubaneswar"},
    "99201": {"circle": "Odisha", "lat": 20.2961, "lon": 85.8245, "city": "Bhubaneswar"},
    "99202": {"circle": "Odisha", "lat": 20.2961, "lon": 85.8245, "city": "Bhubaneswar"},
    
    "99300": {"circle": "Assam", "lat": 26.1445, "lon": 91.7362, "city": "Guwahati"},
    "99301": {"circle": "Assam", "lat": 26.1445, "lon": 91.7362, "city": "Guwahati"},
    "99302": {"circle": "Assam", "lat": 26.1445, "lon": 91.7362, "city": "Guwahati"},
    
    "99400": {"circle": "Madhya Pradesh", "lat": 23.2599, "lon": 77.4126, "city": "Bhopal"},
    "99401": {"circle": "Madhya Pradesh", "lat": 23.2599, "lon": 77.4126, "city": "Bhopal"},
    "99402": {"circle": "Madhya Pradesh", "lat": 22.7196, "lon": 75.8577, "city": "Indore"},
    "99403": {"circle": "Madhya Pradesh", "lat": 22.7196, "lon": 75.8577, "city": "Indore"},
    
    "99500": {"circle": "Uttar Pradesh West", "lat": 28.6692, "lon": 77.4538, "city": "Noida"},
    "99501": {"circle": "Uttar Pradesh West", "lat": 28.6692, "lon": 77.4538, "city": "Noida"},
    "99502": {"circle": "Uttar Pradesh West", "lat": 28.6692, "lon": 77.4538, "city": "Noida"},
    "99503": {"circle": "Uttar Pradesh West", "lat": 27.1767, "lon": 78.0081, "city": "Agra"},
    "99504": {"circle": "Uttar Pradesh West", "lat": 27.1767, "lon": 78.0081, "city": "Agra"},
    
    "99600": {"circle": "Himachal Pradesh", "lat": 31.1048, "lon": 77.1734, "city": "Shimla"},
    "99601": {"circle": "Himachal Pradesh", "lat": 31.1048, "lon": 77.1734, "city": "Shimla"},
    
    "99700": {"circle": "Jammu & Kashmir", "lat": 34.0837, "lon": 74.7973, "city": "Srinagar"},
    "99701": {"circle": "Jammu & Kashmir", "lat": 34.0837, "lon": 74.7973, "city": "Srinagar"},
    "99702": {"circle": "Jammu & Kashmir", "lat": 32.7266, "lon": 74.8570, "city": "Jammu"},
    "99703": {"circle": "Jammu & Kashmir", "lat": 32.7266, "lon": 74.8570, "city": "Jammu"},
    
    "99800": {"circle": "North East", "lat": 25.5788, "lon": 91.8933, "city": "Shillong"},
    "99801": {"circle": "North East", "lat": 25.5788, "lon": 91.8933, "city": "Shillong"},
    "99802": {"circle": "North East", "lat": 23.8315, "lon": 91.2868, "city": "Agartala"},
    "99803": {"circle": "North East", "lat": 27.1767, "lon": 94.1254, "city": "Itanagar"},
    
    "99900": {"circle": "Jharkhand", "lat": 23.3441, "lon": 85.3096, "city": "Ranchi"},
    "99901": {"circle": "Jharkhand", "lat": 23.3441, "lon": 85.3096, "city": "Ranchi"},
    "99902": {"circle": "Jharkhand", "lat": 22.8046, "lon": 86.2029, "city": "Jamshedpur"},
    "99903": {"circle": "Jharkhand", "lat": 22.8046, "lon": 86.2029, "city": "Jamshedpur"},
    
    "99990": {"circle": "Chhattisgarh", "lat": 21.2514, "lon": 81.6296, "city": "Raipur"},
    "99991": {"circle": "Chhattisgarh", "lat": 21.2514, "lon": 81.6296, "city": "Raipur"},
    "99992": {"circle": "Chhattisgarh", "lat": 21.2514, "lon": 81.6296, "city": "Raipur"},
}

def get_indian_telecom_circle(phone_digits: str) -> dict:
    """Get telecom circle info based on Indian mobile number prefix."""
    # Remove country code if present
    if phone_digits.startswith("91"):
        phone_digits = phone_digits[2:]
    if phone_digits.startswith("0"):
        phone_digits = phone_digits[1:]
    
    # Try matching 5-digit prefix first (most specific)
    prefix_5 = phone_digits[:5]
    if prefix_5 in INDIAN_TELECOM_CIRCLES:
        return INDIAN_TELECOM_CIRCLES[prefix_5]
    
    # Try 4-digit prefix
    prefix_4 = phone_digits[:4]
    if prefix_4 in INDIAN_TELECOM_CIRCLES:
        return INDIAN_TELECOM_CIRCLES[prefix_4]
    
    # Try 3-digit prefix
    prefix_3 = phone_digits[:3]
    if prefix_3 in INDIAN_TELECOM_CIRCLES:
        return INDIAN_TELECOM_CIRCLES[prefix_3]
    
    # Try 2-digit prefix (for 7x series Jio numbers)
    prefix_2 = phone_digits[:2]
    if prefix_2 in INDIAN_TELECOM_CIRCLES:
        return INDIAN_TELECOM_CIRCLES[prefix_2]
    
    return None

async def get_coordinates_for_location(country_code: str, region: str = None, phone_digits: str = None) -> dict:
    """Get coordinates for a phone location using telecom circle data or geocoding."""
    
    # For Indian numbers, use telecom circle mapping for most accurate location
    if country_code == "IN" and phone_digits:
        circle_info = get_indian_telecom_circle(phone_digits)
        if circle_info:
            return {
                "lat": circle_info["lat"], 
                "lon": circle_info["lon"], 
                "city": circle_info["city"],
                "circle": circle_info["circle"]
            }
    
    # Check country coordinates
    if country_code in COUNTRY_COORDINATES:
        coords = COUNTRY_COORDINATES[country_code]
        return {"lat": coords["lat"], "lon": coords["lon"], "city": coords.get("city", ""), "circle": None}
    
    # Try geocoding with Nominatim as fallback
    if region:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://nominatim.openstreetmap.org/search",
                    params={
                        "q": region,
                        "format": "json",
                        "limit": 1
                    },
                    headers={"User-Agent": "NetStalker-Educational/1.0"},
                    timeout=5.0
                )
                data = response.json()
                if data and len(data) > 0:
                    return {
                        "lat": float(data[0]["lat"]),
                        "lon": float(data[0]["lon"]),
                        "city": data[0].get("display_name", "").split(",")[0],
                        "circle": None
                    }
        except Exception as e:
            logging.warning(f"Geocoding failed: {e}")
    
    return {"lat": 0, "lon": 0, "city": "", "circle": None}

# ==================== Routes ====================

@api_router.get("/")
async def root():
    return {"message": "NetStalker API - Educational Cybersecurity Platform"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "NetStalker API"}

# Phone Lookup Endpoint
@api_router.post("/phone/lookup", response_model=PhoneLookupResponse)
async def lookup_phone(request: PhoneLookupRequest):
    """
    Lookup phone number information including carrier, location, and coordinates.
    Uses phonenumbers library for validation and geocoding for coordinates.
    """
    try:
        # Clean the phone number
        phone_str = request.phone_number.strip()
        
        # Parse the phone number
        try:
            if request.country_code:
                parsed = phonenumbers.parse(phone_str, request.country_code.upper())
            else:
                # Try to parse with + prefix or assume US
                if not phone_str.startswith('+'):
                    # Try with IN first for Indian numbers (starting with 9, 8, 7, 6)
                    if phone_str[0] in ['9', '8', '7', '6'] and len(phone_str) == 10:
                        try:
                            parsed = phonenumbers.parse(phone_str, "IN")
                        except:
                            parsed = phonenumbers.parse(phone_str, "US")
                    else:
                        try:
                            parsed = phonenumbers.parse(phone_str, "US")
                        except:
                            parsed = phonenumbers.parse("+" + phone_str)
                else:
                    parsed = phonenumbers.parse(phone_str)
        except Exception as e:
            return PhoneLookupResponse(
                valid=False,
                phone_number=phone_str,
                formatted_national=None,
                formatted_international=None
            )
        
        # Validate the number
        is_valid = phonenumbers.is_valid_number(parsed)
        
        if not is_valid:
            return PhoneLookupResponse(
                valid=False,
                phone_number=phone_str,
                formatted_national=phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.NATIONAL),
                formatted_international=phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.INTERNATIONAL)
            )
        
        # Get carrier info
        carrier_name = carrier.name_for_number(parsed, "en")
        number_type = phonenumbers.number_type(parsed)
        number_type_str = get_number_type_string(number_type)
        
        # Get location info
        country_code = phonenumbers.region_code_for_number(parsed)
        location_desc = geocoder.description_for_number(parsed, "en")
        timezones = phone_timezone.time_zones_for_number(parsed)
        
        # Get country name
        country_name = geocoder.country_name_for_number(parsed, "en")
        
        # Get coordinates for the location
        coords = await get_coordinates_for_location(country_code, location_desc)
        
        # Build response
        carrier_info = None
        if carrier_name:
            line_type = "mobile" if number_type == 1 else "landline" if number_type == 0 else number_type_str.lower()
            carrier_info = CarrierInfo(name=carrier_name, line_type=line_type)
        
        location_info = PhoneLocation(
            country=country_name or "Unknown",
            country_code=country_code or "Unknown",
            region=location_desc if location_desc and location_desc != country_name else coords.get("city"),
            city=coords.get("city") if coords.get("city") else None,
            timezone=list(timezones) if timezones else None,
            latitude=coords.get("lat"),
            longitude=coords.get("lon")
        )
        
        # Save to history
        history_entry = LookupHistory(
            lookup_type="phone",
            query=phone_str,
            result_summary=f"Valid: {is_valid}, Country: {country_name}, Carrier: {carrier_name or 'Unknown'}, Coords: {coords.get('lat'):.4f}, {coords.get('lon'):.4f}"
        )
        history_doc = history_entry.model_dump()
        history_doc['timestamp'] = history_doc['timestamp'].isoformat()
        await db.lookup_history.insert_one(history_doc)
        
        return PhoneLookupResponse(
            valid=True,
            phone_number=phone_str,
            formatted_national=phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.NATIONAL),
            formatted_international=phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.INTERNATIONAL),
            country_code=f"+{parsed.country_code}",
            carrier=carrier_info,
            location=location_info,
            number_type=number_type_str
        )
        
    except Exception as e:
        logging.error(f"Phone lookup error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to lookup phone number: {str(e)}")

# IP Geolocation Endpoint
@api_router.post("/ip/lookup", response_model=IPLookupResponse)
async def lookup_ip(request: IPLookupRequest):
    """
    Lookup IP address geolocation using ip-api.com (free, no API key required).
    """
    try:
        ip = request.ip_address.strip()
        
        # Validate IP format (basic check)
        if not ip or ip in ["127.0.0.1", "localhost", "0.0.0.0"]:
            return IPLookupResponse(
                success=False,
                ip_address=ip,
                location=None
            )
        
        # Call ip-api.com for geolocation
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"http://ip-api.com/json/{ip}",
                params={
                    "fields": "status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,mobile,proxy,hosting,query"
                },
                timeout=10.0
            )
            data = response.json()
        
        if data.get("status") == "fail":
            return IPLookupResponse(
                success=False,
                ip_address=ip,
                location=None
            )
        
        location = GeoLocation(
            country=data.get("country", "Unknown"),
            country_code=data.get("countryCode", ""),
            region=data.get("region", ""),
            region_name=data.get("regionName", ""),
            city=data.get("city", ""),
            zip_code=data.get("zip", ""),
            latitude=data.get("lat", 0),
            longitude=data.get("lon", 0),
            timezone=data.get("timezone", "")
        )
        
        # Save to history
        history_entry = LookupHistory(
            lookup_type="ip",
            query=ip,
            result_summary=f"Country: {data.get('country')}, City: {data.get('city')}, ISP: {data.get('isp')}"
        )
        history_doc = history_entry.model_dump()
        history_doc['timestamp'] = history_doc['timestamp'].isoformat()
        await db.lookup_history.insert_one(history_doc)
        
        return IPLookupResponse(
            success=True,
            ip_address=data.get("query", ip),
            location=location,
            isp=data.get("isp"),
            org=data.get("org"),
            as_info=data.get("as"),
            is_mobile=data.get("mobile", False),
            is_proxy=data.get("proxy", False),
            is_hosting=data.get("hosting", False)
        )
        
    except httpx.HTTPError as e:
        logging.error(f"IP lookup HTTP error: {str(e)}")
        raise HTTPException(status_code=503, detail="Geolocation service unavailable")
    except Exception as e:
        logging.error(f"IP lookup error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to lookup IP: {str(e)}")

# Get client's own IP info
@api_router.get("/ip/me", response_model=IPLookupResponse)
async def get_my_ip():
    """
    Get the server's public IP information (for demonstration).
    """
    try:
        async with httpx.AsyncClient() as client:
            # First get public IP
            ip_response = await client.get("https://api.ipify.org?format=json", timeout=5.0)
            ip_data = ip_response.json()
            public_ip = ip_data.get("ip", "")
            
            # Then get geolocation
            geo_response = await client.get(
                f"http://ip-api.com/json/{public_ip}",
                params={
                    "fields": "status,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,mobile,proxy,hosting,query"
                },
                timeout=10.0
            )
            data = geo_response.json()
        
        if data.get("status") == "fail":
            return IPLookupResponse(success=False, ip_address=public_ip)
        
        location = GeoLocation(
            country=data.get("country", "Unknown"),
            country_code=data.get("countryCode", ""),
            region=data.get("region", ""),
            region_name=data.get("regionName", ""),
            city=data.get("city", ""),
            zip_code=data.get("zip", ""),
            latitude=data.get("lat", 0),
            longitude=data.get("lon", 0),
            timezone=data.get("timezone", "")
        )
        
        return IPLookupResponse(
            success=True,
            ip_address=data.get("query", public_ip),
            location=location,
            isp=data.get("isp"),
            org=data.get("org"),
            as_info=data.get("as"),
            is_mobile=data.get("mobile", False),
            is_proxy=data.get("proxy", False),
            is_hosting=data.get("hosting", False)
        )
    except Exception as e:
        logging.error(f"Get my IP error: {str(e)}")
        return IPLookupResponse(success=False, ip_address="Unknown")

# Get lookup history
@api_router.get("/history", response_model=List[LookupHistory])
async def get_lookup_history(limit: int = 20):
    """
    Get recent lookup history.
    """
    history = await db.lookup_history.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    
    for entry in history:
        if isinstance(entry.get('timestamp'), str):
            entry['timestamp'] = datetime.fromisoformat(entry['timestamp'])
    
    return history

# Educational content endpoint
@api_router.get("/educational/content")
async def get_educational_content():
    """
    Get educational content about cybersecurity and tracking methods.
    """
    return {
        "disclaimer": "This platform is designed for educational purposes only. The information and tools provided are meant to help users understand how phone and IP tracking works in cybersecurity contexts. Unauthorized tracking or surveillance of individuals is illegal and unethical.",
        "topics": [
            {
                "id": "phone_tracking",
                "title": "How Phone Number Tracking Works",
                "content": "Phone numbers contain valuable metadata including country codes, carrier information, and number types. Telecom databases maintain records that link numbers to carriers and general geographic regions. This information is publicly available through various APIs and is commonly used for legitimate purposes like fraud prevention and customer verification.",
                "key_points": [
                    "Phone numbers are assigned in blocks to carriers by regulatory bodies",
                    "The country code (+1, +44, etc.) identifies the nation",
                    "Area codes can indicate geographic regions",
                    "Carrier lookup uses HLR (Home Location Register) databases",
                    "Number portability means numbers can change carriers"
                ]
            },
            {
                "id": "ip_geolocation",
                "title": "Understanding IP Geolocation",
                "content": "IP addresses are assigned by Internet Service Providers and contain geographic information. Geolocation databases map IP ranges to physical locations, though accuracy varies. Urban areas typically have higher accuracy than rural regions. VPNs and proxies can mask true locations.",
                "key_points": [
                    "IP addresses are assigned hierarchically (IANA → RIRs → ISPs → Users)",
                    "IPv4 addresses are 32-bit (e.g., 192.168.1.1)",
                    "IPv6 addresses are 128-bit for expanded address space",
                    "Geolocation accuracy ranges from city-level to country-level",
                    "Dynamic IPs change frequently; static IPs remain constant"
                ]
            },
            {
                "id": "privacy_protection",
                "title": "Protecting Your Digital Privacy",
                "content": "Understanding tracking methods helps you protect your privacy. Use VPNs to mask your IP, be cautious about sharing phone numbers, and understand what information you're revealing online.",
                "key_points": [
                    "Use reputable VPN services to mask your IP address",
                    "Enable two-factor authentication on accounts",
                    "Use virtual phone numbers for sensitive registrations",
                    "Regularly check what information is publicly available about you",
                    "Understand and configure privacy settings on all devices"
                ]
            },
            {
                "id": "legal_ethical",
                "title": "Legal and Ethical Considerations",
                "content": "Tracking and surveillance activities are heavily regulated. Laws vary by jurisdiction but generally require consent or legal authorization. Unauthorized tracking can result in criminal charges.",
                "key_points": [
                    "GDPR in Europe strictly regulates personal data processing",
                    "CCPA in California provides similar protections",
                    "Wiretapping and surveillance laws vary by country",
                    "Corporate tracking must comply with privacy policies",
                    "Always obtain proper authorization before any investigation"
                ]
            }
        ]
    }

# Legacy endpoints
@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    return status_checks

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
