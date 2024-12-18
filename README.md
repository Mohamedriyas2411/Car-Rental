Car Rental Web Application

User Roles:
Renter: Register and list cars for rent, set availability times, and accept or decline booking requests.
Rentee: Search for available cars, send booking requests, and receive booking details via email upon approval.
Mechanic: Login credentials already in database of the Car Rental Company he is not required to register since he is company employee, inspect vehicles, generate bills, and send bills to rentees.

Example mechanic details to add in the Mechanic collection

{
  "userId": "Vivin1234",
  "password": "123456789",
  "role": "mechanic",
  "pincode": "620003"
}

{
  "userId": "Mani1234",
  "password": "789456123",
  "role": "mechanic",
  "pincode": "620004"
}

Functional Highlights:
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

