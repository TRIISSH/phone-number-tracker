import requests
import sys
import json
from datetime import datetime

class NetStalkerAPITester:
    def __init__(self, base_url="https://safetracker-demo.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def test_health_check(self):
        """Test basic health endpoint"""
        try:
            response = requests.get(f"{self.api_url}/health", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Response: {data}"
            self.log_test("Health Check", success, details)
            return success
        except Exception as e:
            self.log_test("Health Check", False, str(e))
            return False

    def test_root_endpoint(self):
        """Test root API endpoint"""
        try:
            response = requests.get(f"{self.api_url}/", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Message: {data.get('message', 'No message')}"
            self.log_test("Root Endpoint", success, details)
            return success
        except Exception as e:
            self.log_test("Root Endpoint", False, str(e))
            return False

    def test_phone_lookup_valid(self):
        """Test phone lookup with valid number"""
        try:
            payload = {
                "phone_number": "+1 650 253 0000",
                "country_code": "US"
            }
            response = requests.post(f"{self.api_url}/phone/lookup", json=payload, timeout=15)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f", Valid: {data.get('valid')}, Country: {data.get('location', {}).get('country', 'N/A')}"
                # Check if response has expected fields
                expected_fields = ['valid', 'phone_number', 'formatted_international']
                missing_fields = [field for field in expected_fields if field not in data]
                if missing_fields:
                    success = False
                    details += f", Missing fields: {missing_fields}"
            
            self.log_test("Phone Lookup (Valid)", success, details)
            return success, response.json() if success else {}
        except Exception as e:
            self.log_test("Phone Lookup (Valid)", False, str(e))
            return False, {}

    def test_phone_lookup_invalid(self):
        """Test phone lookup with invalid number"""
        try:
            payload = {
                "phone_number": "123",
                "country_code": "US"
            }
            response = requests.post(f"{self.api_url}/phone/lookup", json=payload, timeout=15)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                # For invalid numbers, should return valid: false
                expected_invalid = not data.get('valid', True)
                success = expected_invalid
                details += f", Valid: {data.get('valid')}, Expected Invalid: {expected_invalid}"
            
            self.log_test("Phone Lookup (Invalid)", success, details)
            return success
        except Exception as e:
            self.log_test("Phone Lookup (Invalid)", False, str(e))
            return False

    def test_ip_lookup_valid(self):
        """Test IP lookup with valid IP"""
        try:
            payload = {
                "ip_address": "8.8.8.8"
            }
            response = requests.post(f"{self.api_url}/ip/lookup", json=payload, timeout=15)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f", Success: {data.get('success')}, Country: {data.get('location', {}).get('country', 'N/A')}"
                # Check if response has expected fields
                expected_fields = ['success', 'ip_address', 'location']
                missing_fields = [field for field in expected_fields if field not in data]
                if missing_fields:
                    success = False
                    details += f", Missing fields: {missing_fields}"
            
            self.log_test("IP Lookup (Valid)", success, details)
            return success, response.json() if success else {}
        except Exception as e:
            self.log_test("IP Lookup (Valid)", False, str(e))
            return False, {}

    def test_ip_lookup_invalid(self):
        """Test IP lookup with invalid IP"""
        try:
            payload = {
                "ip_address": "127.0.0.1"
            }
            response = requests.post(f"{self.api_url}/ip/lookup", json=payload, timeout=15)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                # For localhost/invalid IPs, should return success: false
                expected_failure = not data.get('success', True)
                success = expected_failure
                details += f", Success: {data.get('success')}, Expected Failure: {expected_failure}"
            
            self.log_test("IP Lookup (Invalid)", success, details)
            return success
        except Exception as e:
            self.log_test("IP Lookup (Invalid)", False, str(e))
            return False

    def test_my_ip(self):
        """Test get my IP endpoint"""
        try:
            response = requests.get(f"{self.api_url}/ip/me", timeout=15)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f", Success: {data.get('success')}, IP: {data.get('ip_address', 'N/A')}"
                # Should have basic fields
                if not data.get('ip_address'):
                    success = False
                    details += ", Missing IP address"
            
            self.log_test("My IP Endpoint", success, details)
            return success
        except Exception as e:
            self.log_test("My IP Endpoint", False, str(e))
            return False

    def test_educational_content(self):
        """Test educational content endpoint"""
        try:
            response = requests.get(f"{self.api_url}/educational/content", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                # Check for expected structure
                has_disclaimer = 'disclaimer' in data
                has_topics = 'topics' in data and isinstance(data['topics'], list)
                success = has_disclaimer and has_topics
                details += f", Has disclaimer: {has_disclaimer}, Has topics: {has_topics}"
                if has_topics:
                    details += f", Topics count: {len(data['topics'])}"
            
            self.log_test("Educational Content", success, details)
            return success
        except Exception as e:
            self.log_test("Educational Content", False, str(e))
            return False

    def test_history_endpoint(self):
        """Test lookup history endpoint"""
        try:
            response = requests.get(f"{self.api_url}/history?limit=10", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                success = isinstance(data, list)
                details += f", Is list: {success}, Count: {len(data) if success else 'N/A'}"
            
            self.log_test("History Endpoint", success, details)
            return success
        except Exception as e:
            self.log_test("History Endpoint", False, str(e))
            return False

    def run_all_tests(self):
        """Run all API tests"""
        print("🔍 Starting NetStalker API Tests...")
        print(f"📡 Testing against: {self.base_url}")
        print("=" * 60)

        # Basic connectivity tests
        if not self.test_health_check():
            print("❌ Health check failed - stopping tests")
            return False

        self.test_root_endpoint()

        # Core functionality tests
        print("\n📞 Testing Phone Lookup APIs...")
        self.test_phone_lookup_valid()
        self.test_phone_lookup_invalid()

        print("\n🌐 Testing IP Lookup APIs...")
        self.test_ip_lookup_valid()
        self.test_ip_lookup_invalid()
        self.test_my_ip()

        print("\n📚 Testing Educational & History APIs...")
        self.test_educational_content()
        self.test_history_endpoint()

        # Summary
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    tester = NetStalkerAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    results = {
        "timestamp": datetime.now().isoformat(),
        "total_tests": tester.tests_run,
        "passed_tests": tester.tests_passed,
        "success_rate": (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0,
        "test_details": tester.test_results
    }
    
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())