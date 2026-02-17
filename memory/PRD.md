# NetStalker - Cybersecurity Educational Platform PRD

## Original Problem Statement
Build a cybersecurity website for phone number and location tracker in a controlled environment specifically for educational purposes.

## User Choices
- Real API service integration (ip-api.com for IP geolocation, phonenumbers library for phone validation)
- All features: Phone lookup, IP location tracking, Educational content
- Dark cyberpunk/hacker aesthetic
- Educational disclaimer for responsible use

## Architecture

### Backend (FastAPI)
- **server.py**: Main API with endpoints for phone/IP lookup, history, educational content
- **Dependencies**: httpx, phonenumbers, motor (MongoDB async driver)
- **Database**: MongoDB for lookup history

### Frontend (React)
- **Pages**: HomePage with 4 tabs
- **Components**: PhoneTracker, IPTracker, EducationalContent, LookupHistory
- **Styling**: Cyberpunk dark theme, JetBrains Mono + Chakra Petch fonts

## User Personas
1. **Security Researchers** - Learning about tracking methods
2. **Students** - Understanding cybersecurity concepts  
3. **Educators** - Teaching privacy and security awareness

## Core Requirements (Static)
- [x] Phone number validation and lookup
- [x] IP address geolocation
- [x] Educational content about tracking methods
- [x] Lookup history tracking
- [x] Educational disclaimer banner
- [x] Dark cyberpunk aesthetic

## What's Been Implemented (Jan 2026)
- ✅ Phone Number Tracker with carrier/location info
- ✅ IP Address Locator with map visualization
- ✅ VPN/Proxy/Hosting detection for IPs
- ✅ Educational Resources with 4 topics
- ✅ FAQ accordion section
- ✅ Lookup History with statistics
- ✅ Dismissible disclaimer banner
- ✅ Responsive cyberpunk UI with neon accents

## API Integrations
- **Phone Validation**: phonenumbers Python library (offline)
- **IP Geolocation**: ip-api.com (free, no API key required)

## Prioritized Backlog

### P0 (Critical) - COMPLETE
- [x] Core phone/IP lookup functionality
- [x] Educational disclaimer

### P1 (High)
- [ ] User authentication for saving lookups
- [ ] Export lookup results to PDF
- [ ] Interactive map with Mapbox integration

### P2 (Medium)
- [ ] Bulk lookup feature
- [ ] API rate limiting per user
- [ ] Dark/Light theme toggle

## Next Tasks
1. Add user authentication for personalized history
2. Implement interactive map with real mapping library
3. Add export functionality for lookup results
