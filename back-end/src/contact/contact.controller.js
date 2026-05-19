const { sendSuccess, sendError } = require("../common/utils/response");
const { sendContactMail } = require("./contact.service");

const sendContactMessage = async (request, reply) => {
  try {
    const data = await sendContactMail(request.body);

    return sendSuccess(reply, {
      statusCode: 202,
      message: "Contact enquiry sent successfully",
      data,
    });
  } catch (error) {
    return sendError(reply, error);
  }
};

module.exports = {
  sendContactMessage,
};
