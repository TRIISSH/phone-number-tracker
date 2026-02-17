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
    Lookup phone number information including carrier and location.
    Uses phonenumbers library for offline validation and parsing.
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
                    # Try with US first
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
        from phonenumbers import COUNTRY_CODE_TO_REGION_CODE
        country_name = geocoder.country_name_for_number(parsed, "en")
        
        # Build response
        carrier_info = None
        if carrier_name:
            line_type = "mobile" if number_type == 1 else "landline" if number_type == 0 else number_type_str.lower()
            carrier_info = CarrierInfo(name=carrier_name, line_type=line_type)
        
        location_info = PhoneLocation(
            country=country_name or "Unknown",
            country_code=country_code or "Unknown",
            region=location_desc if location_desc and location_desc != country_name else None,
            timezone=list(timezones) if timezones else None
        )
        
        # Save to history
        history_entry = LookupHistory(
            lookup_type="phone",
            query=phone_str,
            result_summary=f"Valid: {is_valid}, Country: {country_name}, Carrier: {carrier_name or 'Unknown'}"
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
