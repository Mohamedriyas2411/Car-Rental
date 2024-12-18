const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const path = require('path');
const cors = require('cors');
const { log } = require('console');
const nodemailer = require('nodemailer');

mongoose.connect('mongodb://localhost:27017/car_rental', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("Connected to MongoDB"))
    .catch(err => console.error("Could not connect to MongoDB", err));

    const userSchema = new mongoose.Schema({
        userId: { type: String, unique: true },
        name: String,
        email: { type: String, unique: true },
        password: String,
        phone: String, 
        role: String,
        licenseNumber: String,
        aadharNumber: String,
        carModel: String,
        carYear: Number,
        address: String,
        pincode: String,
        price: Number,
        availability: {
            fromDate: String,
            toDate: String,
            fromTime: String,
            toTime: String
        },
        requests: [ 
            {
                renteeId: String,
                renteeName: String,
                renteeAddress: String,
                renteePhone: String, 
                requestDate: { type: Date, default: Date.now },
                status: { type: String, default: 'Pending' }, 
                bookingId: String 
            }
        ]
    });
    

const User = mongoose.model('User', userSchema);

const Mechanic = mongoose.model('Mechanic', new mongoose.Schema({}, { strict: false }), 'Mechanic');


const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

function generateBookingId() {
    return 'BOOK' + Date.now(); 
  }


app.get('/getRequests', async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ success: false, message: "User ID is required." });
    }

    try {

        const renter = await User.findOne({ userId, role: 'renter' });

        if (!renter) {
            return res.status(404).json({ success: false, message: "Renter not found." });
        }

        const pendingRequests = renter.requests.filter(request => request.status === 'Pending');

        if (pendingRequests.length === 0) {
            return res.status(404).json({ success: false, message: "No pending requests found." });
        }

        res.json({
            success: true,
            requests: pendingRequests,
        });
    } catch (error) {
        console.error("Error fetching requests:", error.message);
        res.status(500).json({ success: false, message: "Failed to fetch requests.", error: error.message });
    }
});

app.post('/updateRequestStatus', async (req, res) => {
    const { renterId, renteeId, status } = req.body;

    if (!renterId || !renteeId || !status) {
        return res.status(400).json({ success: false, message: "Invalid input" });
    }

    if (!['Accepted', 'Rejected'].includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid status" });
    }

    try {
        await User.updateOne(
            { userId: renterId, "requests.renteeId": renteeId },
            { $set: { "requests.$.status": status } }
        );

        res.status(200).json({ success: true, message: `Request ${status.toLowerCase()} successfully` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.post('/getRequestStatus', async (req, res) => {
    const { renteeId } = req.body;

    if (!renteeId) {
        return res.status(400).json({ success: false, message: 'Rentee ID is required' });
    }

    try {
        const renters = await User.find({ role: 'renter', "requests.renteeId": renteeId });
        const requests = [];

        renters.forEach(renter => {
            renter.requests.forEach(request => {
                if (request.renteeId === renteeId) {
                    requests.push({ 
                        ownerId: renter.userId, 
                        status: request.status,
                        bookingId: request.bookingId
                    });
                }
            });
        });

        return res.status(200).json({ success: true, requests });
    } catch (error) {
        console.error('Error fetching request status:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

app.post('/sendBill', async (req, res) => {
    const { bookingId, startingKm, endingKm, pricePerKm, coverageAmount } = req.body;

    if (!bookingId || !startingKm || !endingKm || !pricePerKm) {
        return res.status(400).json({ success: false, message: "All required fields must be provided." });
    }

    try {
        const user = await User.findOne({
            "requests.bookingId": bookingId,
            role: "rentee" 
        });

        if (!user) {
            return res.status(404).json({ success: false, message: "Booking ID not found or user is not a rentee." });
        }

        const request = user.requests.find(req => req.bookingId === bookingId);
        if (!request) {
            return res.status(404).json({ success: false, message: "Request not found." });
        }

        const distance = endingKm - startingKm;
        const billAmount = distance * pricePerKm;
        const serviceCharge = billAmount * 0.05;
        const totalAmount = billAmount + serviceCharge;
        const securityDeposit = 10000;

        let remainingAmount = 0;
        let amountToCollect = 0;
        let paymentStatus = "";

        if (totalAmount <= securityDeposit) {
            remainingAmount = securityDeposit - totalAmount;
            paymentStatus = `Remaining Amount Returned: ₹${remainingAmount.toFixed(2)}`;
        } else {
            amountToCollect = totalAmount - securityDeposit;
            paymentStatus = `Amount to be Collected: ₹${amountToCollect.toFixed(2)}`;
        }

        const billHtml = `
            <h3>Car Rental Bill</h3>
            <table border="1" cellspacing="0" cellpadding="5">
                <tr>
                    <th>Booking ID</th>
                    <td>${bookingId}</td>
                </tr>
                <tr>
                    <th>Starting Km</th>
                    <td>${startingKm}</td>
                </tr>
                <tr>
                    <th>Ending Km</th>
                    <td>${endingKm}</td>
                </tr>
                <tr>
                    <th>Distance Covered</th>
                    <td>${distance} Km</td>
                </tr>
                <tr>
                    <th>Price per Km</th>
                    <td>₹${pricePerKm}</td>
                </tr>
                <tr>
                    <th>Bill Amount</th>
                    <td>₹${billAmount.toFixed(2)}</td>
                </tr>
                <tr>
                    <th>Service Charge (5%)</th>
                    <td>₹${serviceCharge.toFixed(2)}</td>
                </tr>
                <tr>
                    <th>Total Amount</th>
                    <td>₹${totalAmount.toFixed(2)}</td>
                </tr>
                <tr>
                    <th>Payment Status</th>
                    <td>${paymentStatus}</td>
                </tr>
            </table>
        `;

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'mohammedriyas2411@gmail.com',
                pass: 'smof qgtg dwdx ihsv'
            }
        });

        const mailOptions = {
            from: '"Car Rental Service" <mohammedriyas2411@gmail.com>',
            to: user.email, 
            subject: "Your Rental Bill",
            html: billHtml
        };
        console.log(user.email);

        await transporter.sendMail(mailOptions);

        res.status(200).json({ success: true, message: "Bill sent successfully!" });
    } catch (err) {
        console.error("Error sending bill:", err.message);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

app.post('/saveBookingId', async (req, res) => {
    const { requestId, bookingId } = req.body;

    console.log('Incoming request data:', { requestId, bookingId }); 

    try {
        const user = await User.findOne({ "requests.bookingId": requestId });

        if (user) {
            console.log('Fetched user:', user); 
            console.log('User requests array:', user.requests); 

            const request = user.requests.find(req => req.bookingId === requestId);
            if (request) {
                request.bookingId = bookingId;
                await user.save();
                res.json({ success: true });
            } else {
                console.log('Request not found for bookingId:', requestId); 
                res.json({ success: false, message: 'Request not found' });
            }
        } else {
            console.log('User not found for requestId:', requestId); 
            res.json({ success: false, message: 'User not found' });
        }
    } catch (error) {
        console.error('Error saving Booking ID:', error); 
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

app.post('/acceptRequest', async (req, res) => {
    const { renterId, renteeId } = req.body;

    console.log("Rentee ID received:", renteeId);

    if (!renterId || !renteeId) {
        return res.status(400).json({ success: false, message: "Renter ID and Rentee ID are required" });
    }

    try {
        const bookingId = generateBookingId();

        const rentee = await User.findOne({ userId: renteeId });
        if (!rentee) {
            console.error(`Rentee with ID ${renteeId} not found.`);
            return res.status(404).json({ success: false, message: "Rentee not found" });
        }

        console.log("Rentee found:", rentee);

        const renterUpdate = await User.updateOne(
            { userId: renterId, "requests.renteeId": renteeId },
            {
                $set: {
                    "requests.$.status": "Accepted",
                    "requests.$.bookingId": bookingId,
                    "requests.$.renteePhone": rentee.phone, 
                },
            }
        );

        if (renterUpdate.matchedCount === 0) {
            console.error(`Request not found for renter with ID ${renterId} and rentee ID ${renteeId}`);
            return res.status(404).json({ success: false, message: "Request not found for renter" });
        }

        const renteeUpdate = await User.updateOne(
            { userId: renteeId },
            {
                $push: {
                    requests: {
                        status: "Accepted",
                        bookingId: bookingId,
                        updatedBy: "System", 
                    },
                },
            }
        );

        if (renteeUpdate.matchedCount === 0) {
            console.warn(`Unable to add booking ID ${bookingId} to rentee's data. Rentee ID: ${renteeId}`);
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'mohammedriyas2411@gmail.com',
                pass: 'smof qgtg dwdx ihsv'
            }
        });
        

        const mailOptions = {
            from: '"Car Rental Service" <mohammedriyas2411@gmail.com>',
            to: rentee.email,
            subject: "Your Car Rental Booking Confirmation",
            html: `
                <p>Dear ${rentee.name},</p>
                <p>Your car rental is confirmed. The booking ID is <strong>${bookingId}</strong>.</p>
                <p>Our mechanic will contact you soon.</p>
                <p>Thank you for using our service!</p>
            `,
        };
        console.log(rentee.email);


        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error("Error sending email:", error);
                return res.status(500).json({ success: false, message: "Failed to send email" });
            }
            console.log("Email sent: " + info.response);
        });

        return res.status(200).json({
            success: true,
            message: "Request accepted successfully",
            bookingId,
            renteePhone: rentee.phone,
        });
    } catch (err) {
        console.error("Error accepting request:", err); 
        return res.status(500).json({ success: false, message: "Server error" });
    }
});

app.post('/sendRequest', async (req, res) => {
    const { renteeId, ownerId } = req.body;

    if (!renteeId || !ownerId) {
        return res.status(400).json({ success: false, message: 'Invalid request data.' });
    }

    try {
        const owner = await User.findOne({
            userId: ownerId,
            role: 'renter',
            requests: {
                $elemMatch: { renteeId, status: { $in: ['Pending', 'Rejected'] } }
            }
        });

        if (owner) {
            const status = owner.requests.find(req => req.renteeId === renteeId)?.status;
            if (status === 'Pending') {
                return res.status(400).json({ success: false, message: 'You already have a pending request with this renter.' });
            } else if (status === 'Rejected') {
                return res.status(400).json({ success: false, message: 'Your previous request was rejected. You cannot send another request to this renter.' });
            }
        }

        const rentee = await User.findOne({ userId: renteeId, role: 'rentee' });
        if (!rentee) {
            return res.status(404).json({ success: false, message: 'Rentee not found.' });
        }

        const update = {
            $push: {
                requests: {
                    renteeId: rentee.userId,
                    renteeAddress: rentee.address,
                    status: 'Pending',
                },
            },
        };

        const updatedOwner = await User.findOneAndUpdate(
            { userId: ownerId, role: 'renter' },
            update,
            { new: true }
        );

        if (!updatedOwner) {
            return res.status(404).json({ success: false, message: 'Renter not found.' });
        }

        res.json({ success: true, message: 'Request sent successfully.' });
    } catch (error) {
        console.error('Error sending request:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});


app.post('/clearRequestStatus', async (req, res) => {
    const { renteeId, ownerId } = req.body;

    if (!renteeId || !ownerId) {
        return res.status(400).json({ success: false, message: 'Rentee ID and Owner ID are required' });
    }

    try {
        const renter = await User.findOne({ userId: ownerId, role: 'renter' });

        if (!renter) {
            return res.status(404).json({ success: false, message: 'Owner not found' });
        }

        renter.requests = renter.requests.filter(req => req.renteeId !== renteeId);

        await renter.save();

        res.status(200).json({ success: true, message: 'Request cleared successfully' });
    } catch (error) {
        console.error('Error clearing request:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});


app.post('/updateAvailability', async (req, res) => {
    const { userId, availabilityId, fromDate, toDate, fromTime, toTime } = req.body;

    if (!userId || !fromDate || !toDate || !fromTime || !toTime) {
        return res.status(400).json({ success: false, message: "All fields are required" });
    }

    try {
        let user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (availabilityId) {
            const availability = user.availability.id(availabilityId);
            if (availability) {
                availability.fromDate = fromDate;
                availability.toDate = toDate;
                availability.fromTime = fromTime;
                availability.toTime = toTime;
            } else {
                return res.status(404).json({ success: false, message: "Availability entry not found" });
            }
        } else {
            user.availability = ({ fromDate, toDate, fromTime, toTime });
        }

        await user.save();
        res.json({ success: true, message: "Availability updated successfully" });
    } catch (error) {
        console.error("Error updating availability:", error.message);
        res.status(500).json({ success: false, message: "Failed to update availability", error: error.message });
    }
});



app.post('/register', async (req, res) => {
    const { userId, name, email, password, phone, role, licenseNumber, aadharNumber, carModel, carYear, address, pincode, price } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            userId,
            name,
            email,
            password: hashedPassword,
            phone,
            role,
            licenseNumber,
            aadharNumber,
            carModel,
            carYear,
            address,
            pincode,
            price
        });
        await newUser.save();
        res.json({ success: true, message: "User registered successfully" });
    } catch (error) {
        console.error("Error saving user:", error.message);
        res.status(500).json({ success: false, message: "Failed to register user", error: error.message });
    }
});
app.post('/mechanicLogin', async (req, res) => {
    const { userId, password } = req.body;

    if (!userId || !password) {
        return res.status(400).json({ success: false, message: "Please provide all required fields." });
    }

    try {
        const mechanic = await Mechanic.findOne({ userId });
        if (!mechanic) {
            return res.status(400).json({ success: false, message: "Mechanic not found" });
        }

        if (password !== mechanic.password) {
            return res.status(400).json({ success: false, message: "Invalid password" });
        }

        res.json({
            success: true,
            message: "Login successful",
            pincode: mechanic.pincode, 
        });
    } catch (error) {
        console.error("Mechanic login error:", error.message);
        res.status(500).json({ success: false, message: "An error occurred during login" });
    }
});

app.post('/fetchMechanicBookings', async (req, res) => {
    const { pincode } = req.body;

    if (!pincode) {
        return res.status(400).json({ success: false, message: "Pincode is required" });
    }

    try {
        const renters = await User.find({
            role: 'renter',
            pincode,
            "requests.bookingId": { $exists: true }, 
        });

        const bookings = renters.flatMap(renter =>
            renter.requests
                .filter(request => request.bookingId)
                .map(request => ({
                    renterName: renter.userId,
                    renterAddress: renter.address,
                    renterPhone: renter.phone,
                    bookingId: request.bookingId,
                    renteeId: request.renteeId,
                    renteePhone: request.renteePhone,
                    requestDate: request.requestDate,
                }))
        );

        if (bookings.length === 0) {
            return res.status(404).json({ success: false, message: "No bookings found." });
        }

        res.json({ success: true, bookings });
    } catch (error) {
        console.error("Error fetching bookings:", error.message);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

app.post('/login', async (req, res) => {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
        return res.status(400).json({ success: false, message: "Please provide all required fields." });
    }

    try {
        let user;

        if (role === 'mechanic') {
            user = await Mechanic.findOne({ userId: username });
            if (!user) {
                return res.status(400).json({ success: false, message: "Mechanic not found" });
            }

            if (password !== user.password) {
                return res.status(400).json({ success: false, message: "Invalid password" });
            }
        } else {
            user = await User.findOne({ userId: username });
            if (!user) {
                return res.status(400).json({ success: false, message: "User not found" });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ success: false, message: "Invalid password" });
            }
        }

        if (role !== user.role) {
            return res.status(400).json({ success: false, message: "Role mismatch" });
        }

        const responseData = { success: true, message: "Login successful" };
        if (role === 'mechanic') {
            responseData.pincode = user.pincode;
        }

        res.json(responseData);
    } catch (error) {
        console.error("Login error:", error.message);
        res.status(500).json({ success: false, message: "An error occurred during login" });
    }
});

app.get('/fetchBookings', async (req, res) => {
    const { mechanicId } = req.query;

    if (!mechanicId) {
        return res.status(400).json({ success: false, message: "Mechanic ID is required" });
    }

    try {
        const bookings = await User.find({
            "requests.bookingId": { $exists: true },
            role: 'renter', 
        });

        const mechanicBookings = bookings.flatMap(renter => 
            renter.requests.filter(request => request.bookingId && request.status === 'Accepted')
        );

        res.json({ success: true, bookings: mechanicBookings });
    } catch (error) {
        console.error('Error fetching bookings:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
});
app.post('/deleteBooking', async (req, res) => {
    const { bookingId } = req.body;

    if (!bookingId) {
        return res.status(400).json({ success: false, message: "Booking ID is required" });
    }

    try {
        const update = await User.updateOne(
            { "requests.bookingId": bookingId },
            { $pull: { requests: { bookingId } } }
        );

        if (update.modifiedCount === 0) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }

        res.json({ success: true, message: "Booking cleared successfully" });
    } catch (error) {
        console.error('Error clearing booking:', error.message);
        res.status(500).json({ success: false, message: 'Failed to clear booking', error: error.message });
    }
});
app.post('/generateBill', async (req, res) => {
    const { bookingId } = req.body;

    if (!bookingId) {
        return res.status(400).json({ success: false, message: "Booking ID is required" });
    }

    try {
        const renter = await User.findOne({ "requests.bookingId": bookingId });
        const booking = renter.requests.find(request => request.bookingId === bookingId);

        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }

        res.json({
            success: true,
            bookingDetails: {
                ownerId: renter.userId,
                renteeId: booking.renteeId,
                bookingId: booking.bookingId,
                status: booking.status,
                date: booking.requestDate,
            },
        });
    } catch (error) {
        console.error('Error fetching booking details:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
});

app.post('/search', async (req, res) => {
    const { pincode } = req.body;

    if (!pincode) {
        return res.status(400).json({ success: false, message: "Pincode is required" });
    }

    try {
        const renters = await User.find({
            role: 'renter',
            pincode: pincode, 
        });

        if (renters.length === 0) {
            return res.status(404).json({ success: false, message: "No renters found in this pincode." });
        }

        const renterDetails = renters.map(renter => ({
            userId: renter.userId,
            name: renter.name,
            address: renter.address,
            carModel: renter.carModel,
            price: renter.price,
            availability: renter.availability,
        }));

        return res.json({ success: true, renters: renterDetails });
    } catch (error) {
        console.error("Error fetching renters:", error.message);
        return res.status(500).json({ success: false, message: "Failed to fetch renters", error: error.message });
    }
});

app.post('/getMechanicPincode', async (req, res) => {
    const { mechanicId } = req.body;

    if (!mechanicId) {
        return res.status(400).json({ success: false, message: 'Mechanic ID is required' });
    }

    try {
        const mechanic = await Mechanic.findOne({ _id: mechanicId }); 

        if (!mechanic) {
            return res.status(404).json({ success: false, message: 'Mechanic not found' });
        }

        return res.status(200).json({ success: true, pincode: mechanic.pincode });
    } catch (error) {
        console.error('Error fetching pincode:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});


app.listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
});

