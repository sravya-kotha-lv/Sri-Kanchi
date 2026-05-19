const env = require("../config/env");
const { validateRequest } = require("../common/utils/request-validation");
const { sendContactMessage } = require("./contact.controller");
const { contactMailSchema } = require("./contact.validation");

async function contactRoutes(fastify) {
  fastify.post(
    `${env.apiPrefix}/contact/send-mail`,
    {
      preValidation: [validateRequest(contactMailSchema)],
    },
    sendContactMessage
  );
}

module.exports = contactRoutes;
