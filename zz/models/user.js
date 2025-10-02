"use strict";
const { Model } = require("sequelize");
const bcrypt = require("bcryptjs");

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // Relation N:N avec Role via UserRole
      User.belongsToMany(models.Role, {
        through: models.UserRole,
        foreignKey: "user_id",
        otherKey: "role_id",
        as: "roles",
      });

      // Relations pour l'audit - seulement si AuditLog existe
      if (models.AuditLog) {
        User.hasMany(models.AuditLog, {
          foreignKey: "user_id",
          as: "auditLogs"
        });

        User.hasMany(models.AuditLog, {
          foreignKey: "modified_by",
          as: "modificationsPerformed"
        });
      }
    }

    // Instance method to check password
    async checkPassword(password) {
      return await bcrypt.compare(password, this.password);
    }

    // Instance method to check if user has role
    async hasRole(roleName) {
      const roles = await this.getRoles();
      return roles.some(role => role.name === roleName && role.is_active);
    }

    // Instance method to check if user has any of the roles
    async hasAnyRole(roleNames) {
      const roles = await this.getRoles();
      return roles.some(role => roleNames.includes(role.name) && role.is_active);
    }

    // Instance method to get active roles
    async getActiveRoles() {
      const roles = await this.getRoles();
      return roles.filter(role => role.is_active);
    }

    // Generate email verification code
    generateVerificationCode() {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      this.emailVerificationCode = code;
      this.emailVerificationExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      return code;
    }

    // Verify email verification code
    verifyEmailCode(code) {
      if (!this.emailVerificationCode) {
        return false;
      }
      
      if (new Date() > new Date(this.emailVerificationExpires)) {
        return false; // Code expiré
      }
      
      return this.emailVerificationCode === code;
    }

    // Check if verification code is expired
    isVerificationCodeExpired() {
      if (!this.emailVerificationExpires) return true;
      return new Date() > new Date(this.emailVerificationExpires);
    }

    // Track suspicious activity
    async trackSuspiciousActivity() {
      this.suspiciousActivityCount = (this.suspiciousActivityCount || 0) + 1;
      this.lastSuspiciousActivity = new Date();
      
      // Reset security notification flag if it's been more than 24 hours
      if (this.lastSuspiciousActivity && 
          new Date() - new Date(this.lastSuspiciousActivity) > 24 * 60 * 60 * 1000) {
        this.securityNotificationSent = false;
      }
      
      await this.save();
      return this.suspiciousActivityCount;
    }

    // Instance method to get user without password
    toJSON() {
      const values = Object.assign({}, this.get());
      delete values.password;
      delete values.resetPasswordToken;
      delete values.resetPasswordExpires;
      delete values.emailVerificationToken;
      return values;
    }
  }

  User.init(
    {
      username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: true,
          len: [3, 50]
        }
      },
      firstName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [2, 50]
        }
      },
      lastName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [2, 50]
        }
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true
        }
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [6, 100]
        }
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      lastLogin: {
        type: DataTypes.DATE
      },
      resetPasswordToken: {
        type: DataTypes.STRING
      },
      resetPasswordExpires: {
        type: DataTypes.DATE
      },
      emailVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
    
      emailVerificationCode: {
        type: DataTypes.STRING(6),
        allowNull: true
      },
      emailVerificationExpires: {
        type: DataTypes.DATE,
        allowNull: true
      },
      last_login_ip: {
        type: DataTypes.STRING
      },
      login_attempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      locked_until: {
        type: DataTypes.DATE
      },
      suspiciousActivityCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      lastSuspiciousActivity: {
        type: DataTypes.DATE,
        allowNull: true
      },
      securityNotificationSent: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      }
    },
    {
      sequelize,
      modelName: "User",
      tableName: "Users",
      hooks: {
        beforeCreate: async (user) => {
          if (user.password) {
            const salt = await bcrypt.genSalt(12);
            user.password = await bcrypt.hash(user.password, salt);
          }
        },
        beforeUpdate: async (user) => {
          if (user.changed('password')) {
            const salt = await bcrypt.genSalt(12);
            user.password = await bcrypt.hash(user.password, salt);
          }
        }
      }
    }
  );

  return User;
};