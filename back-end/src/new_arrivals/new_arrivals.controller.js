const { sendSuccess, sendError } = require("../common/utils/response");
const { sendNewArrivalEmail } = require("./new_arrivals.service");

const subscribeToNewArrivals = async (request, reply) => {
  try {
    const { email } = request.body;

    sendNewArrivalEmail(email).catch((error) => {
      request.log.error({ error, email }, "New arrivals email failed");
    });

    return sendSuccess(reply, {
      statusCode: 202,
      message: "New arrivals notification email request accepted",
      data: {
        email,
        emailQueued: true,
      },
    });
  } catch (error) {
    return sendError(reply, error);
  }
};

module.exports = {
  subscribeToNewArrivals,
};
