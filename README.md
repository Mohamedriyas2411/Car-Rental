**Car Rental Web Application**

**User Roles**
### 1. Renter
- Register and list cars for rent.
- Set availability times for the cars.
- Accept or decline booking requests from rentees.

### 2. Rentee
- Search for available cars by location.
- Send booking requests to renters.
- Receive booking details via email upon approval.

### 3. Mechanic
- Login credentials are managed by the Car Rental Company and stored in the database. Registration is not required as mechanics are company employees.
- Inspect vehicles during the rental process.
- Generate bills for inspections and repairs.
- Send bills directly to rentees.

---

## Example Mechanic Details

Below are sample entries for the `Mechanic` collection in the database:

```json
{
  "userId": "Vivin1234",
  "password": "123456789",
  "role": "mechanic",
  "pincode": "620003"
},
{
  "userId": "Mani1234",
  "password": "789456123",
  "role": "mechanic",
  "pincode": "620004"
}


**Functional Highlights:**
Renters can update car availability times dynamically.
Booking IDs are sent to the rentee's email after a request is accepted.
Mechanics can inspect vehicles, generate bills, and ensure car safety.
Cars are searchable by pincode for rentees.

Clone the repository:
git clone https://github.com/Mohamedriyas2411/Car-Rental.git

Navigate to the project directory:
cd Car-Rental

Install dependencies:
npm install

Start the server:
node server.js

Accessing the Application
http://localhost:3000

How It Works
Registration and Login:
Users must choose a role (Renter, Rentee) during registration.
Each role has unique features and permissions.

Renter:
Add cars with availability times.
View and manage booking requests.
Accept requests to send booking IDs to rentees.

Rentee:
Search for cars by pincode.
Request to book a car.
Receive booking confirmation and details via email.

Mechanic:
Generate and send bills to rentees.
Ensure cars are in good condition.

Future Enhancements
Add payment gateway integration.
Implement real-time notifications for requests and responses.

