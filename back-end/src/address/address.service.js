const AppError = require("../common/errors/app-error");
const TransactionalService = require("../common/services/transactional-service");

class AddressService extends TransactionalService {
  constructor({ model, db }) {
    super(db);
    this.model = model;
    this.db = db;
  }

  mapAddress(address) {
    return {
      id: address.id,
      user_id: address.user_id,
      full_name: address.full_name,
      phone: address.phone,
      pincode: address.pincode,
      address_line1: address.address_line1,
      address_line2: address.address_line2,
      city: address.city,
      state: address.state,
      landmark: address.landmark,
      address_type: address.address_type,
      is_default: address.is_default,
      created_at: address.created_at,
      updated_at: address.updated_at,
    };
  }

  async listAddresses(userId) {
    const addresses = await this.model.listByUserId(userId, this.db);
    return addresses.map((address) => this.mapAddress(address));
  }

  async getAddress(userId, addressId) {
    const address = await this.model.findByIdAndUserId(addressId, userId, this.db);

    if (!address) {
      throw new AppError("Address not found", 404, "ADDRESS_NOT_FOUND");
    }

    return this.mapAddress(address);
  }

  async createAddress(userId, payload) {
    return this.withTransaction(async (executor) => {
      const existingAddresses = await this.model.listByUserId(userId, executor);

      const shouldSetDefault = payload.is_default || existingAddresses.length === 0;

      if (shouldSetDefault) {
        await this.model.clearDefault(userId, executor);
      }

      const address = await this.model.create(
        userId,
        {
          ...payload,
          is_default: shouldSetDefault,
        },
        executor
      );

      return this.mapAddress(address);
    });
  }

  async updateAddress(userId, addressId, payload) {
    return this.withTransaction(async (executor) => {
      const existingAddress = await this.model.findByIdAndUserId(
        addressId,
        userId,
        executor
      );

      if (!existingAddress) {
        throw new AppError("Address not found", 404, "ADDRESS_NOT_FOUND");
      }

      if (payload.is_default === true) {
        await this.model.clearDefault(userId, executor);
      }

      const updatedAddress = await this.model.update(
        addressId,
        userId,
        payload,
        executor
      );

      return this.mapAddress(updatedAddress);
    });
  }

  async setDefaultAddress(userId, addressId) {
    return this.withTransaction(async (executor) => {
      const address = await this.model.findByIdAndUserId(addressId, userId, executor);

      if (!address) {
        throw new AppError("Address not found", 404, "ADDRESS_NOT_FOUND");
      }

      await this.model.clearDefault(userId, executor);
      const defaultAddress = await this.model.setDefault(addressId, userId, executor);

      return this.mapAddress(defaultAddress);
    });
  }

  async deleteAddress(userId, addressId) {
    const deletedAddress = await this.model.delete(addressId, userId, this.db);

    if (!deletedAddress) {
      throw new AppError("Address not found", 404, "ADDRESS_NOT_FOUND");
    }

    return {
      message: "Address deleted successfully",
    };
  }
}

module.exports = {
  AddressService,
};
