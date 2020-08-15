const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');
const sequelize = require('../db/sequelize');

const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
      set(value) {
        this.setDataValue('firstName', value.trim());
      },
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
      set(value) {
        this.setDataValue('lastName', value.trim());
      },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      set(value) {
        this.setDataValue('email', value.trim().toLowerCase());
      },
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    tokens: {
      type: DataTypes.TEXT,
      get() {
        if (this.getDataValue('tokens')) {
          return this.getDataValue('tokens').split(',');
        }
        return [];
      },
      set(value) {
        this.setDataValue('tokens', value.join());
      },
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt for each new entry
  },
);

User.prototype.generateAuthToken = async function () {
  const user = this;
  const { id, tokens } = user;

  const token = jwt.sign({ id: id.toString() }, config.get('jwtSecret'));
  tokens.push(token);

  user.tokens = tokens;
  await user.save();

  return token;
};

User.findByCredentials = async (email, password) => {
  const user = await User.findOne({ where: { email } });

  if (!user) {
    return null;
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    return null;
  }
  return user;
};

User.beforeSave(async (userInstance) => {
  if (userInstance.changed('password')) {
    userInstance.password = await bcrypt.hash(userInstance.password, 8);
  }
});

module.exports = User;
