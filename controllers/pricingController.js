const nodemailer = require("nodemailer");
const Pricing = require("../models/pricingModel");
const Property = require("../models/propertyModel"); // adjust path as needed


const pricingSubmit = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phoneNumber,
      email,
      stayingWith,
      profession,
      college,
      company,
      business,
      dateOfVisit,
      timeSlot,
      comparePropertyIds, // <-- receive from frontend
    } = req.body;

    console.log(comparePropertyIds);
    let formattedPropertyDetails = "No properties selected.";
    const allProps = await Property.find({}, '_id');
console.log("All available property IDs in DB:", allProps);
    if (comparePropertyIds?.length) {
      const ids = Array.isArray(comparePropertyIds)
        ? comparePropertyIds
        : [comparePropertyIds];

      const selectedProperties = await Property.find({ _id: { $in: ids } });

      console.log("Fetched properties:", selectedProperties);

      if (selectedProperties.length > 0) {
        formattedPropertyDetails = selectedProperties
          .map((prop, idx) => {
            return `#${idx + 1}: https://toletglobe.in/property/${prop._id}
Owner Contact: ${prop.ownersContactNumber || "N/A"}
Location: Latitude ${prop.latitude || "N/A"}, Longitude ${prop.longitude || "N/A"}`;
          })
          .join("\n\n");
      }
    }

    const formattedPropertyIds = comparePropertyIds?.length
      ? comparePropertyIds
          .map((id, idx) => `#${idx + 1}: https://toletglobe.in/property/${id}`)
          .join("\n")
      : "No properties selected.";



    // Nodemailer transporter
    const transporter = nodemailer.createTransport({
      //host: process.env.SMTP_HOST,
      //port: 465,
      //secure: true,
      service: 'gmail',
      auth: {
        user: "armaanajani646@gmail.com",
        pass: process.env.SMTP_PASS,
      },
    });

    // Mail options
    let mailOptions = {
      from: {
        name: "ToLetGlobe Form",
        address: "armaanajani646@gmail.com",
      },
      to: email, // send confirmation to user
      subject: `Enquiry Confirmation - ToLetGlobe`,
      text: `
Hi ${firstName} ${lastName},

Thank you for your enquiry. We have received the following details:

First Name: ${firstName}
Last Name: ${lastName}
Email: ${email}
Phone Number: ${phoneNumber}
Staying With: ${stayingWith}
Profession: ${profession}
Date of Visit: ${dateOfVisit}
Time Slot: ${timeSlot}

Compared Property IDs:
${formattedPropertyIds}

Our team will contact you shortly.

Best regards,
ToLetGlobe Team
      `,
    };

    // Send email to User
    await transporter.sendMail(mailOptions);

    // Save data to MongoDB
    // const formEntry = new Pricing({
    //   firstName,
    //   lastName,
    //   phoneNumber,
    //   email,
    //   stayingWith,
    //   profession,
    //   college: profession === "Student" ? college : undefined,
    //   company: profession === "Working Professional" ? company : undefined,
    //   business: profession === "Business" ? business : undefined,
    //   dateOfVisit,
    //   timeSlot,
    //   comparePropertyIds, // Save to DB if desired
    // });

    // await formEntry.save();
    const selectedProperties = comparePropertyIds?.length
  ? await Property.find({ _id: { $in: comparePropertyIds } })
  : [];

  
    mailOptions = {
      from: {
        name: "ToLetGlobe Form",
        address: "armaanajani646@gmail.com",
      },
      to: "armaanajani646@gmail.com", // send confirmation to user
      subject: `Enquiry Confirmation - ToLetGlobe`,
      text: `
${firstName} ${lastName} has submiited an enquiry. We have received the following details:

First Name: ${firstName}
Last Name: ${lastName}
Email: ${email}
Phone Number: ${phoneNumber}
Staying With: ${stayingWith}
Profession: ${profession}
Date of Visit: ${dateOfVisit}
Time Slot: ${timeSlot}

Compared Property IDs:
${formattedPropertyDetails}

Best regards,
ToLetGlobe Team
      `,
    };

    // Send email to Backend Team
    await transporter.sendMail(mailOptions);

    res.status(200).send({ msg: "Form submitted successfully." });
  } catch (error) {
    console.error("Error sending mail or saving form:", error);
    res
      .status(500)
      .send({ msg: "Server error. Could not send email or save form." });
  }
};

module.exports = {
  pricingSubmit,
};
