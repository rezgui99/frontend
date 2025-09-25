"use strict";
const { Model } = require("sequelize");
const bcrypt = require("bcryptjs");

module.exports = (sequelize, DataTypes) => {
  class Candidate extends Model {
    static associate(models) {
      // Relations avec les CVs
      Candidate.hasMany(models.CandidateCV, {
        foreignKey: "candidate_id",
        as: "cvs"
      });

      // Relations avec les candidatures
      Candidate.hasMany(models.Application, {
        foreignKey: "candidate_id",
        as: "applications"
      });

      // Relations avec les favoris
      Candidate.hasMany(models.CandidateFavorite, {
        foreignKey: "candidate_id",
        as: "favorites"
      });

      // Relations avec les compétences
      Candidate.hasMany(models.CandidateSkill, {
        foreignKey: "candidate_id",
        as: "skills"
      });
    }

    // Instance method to check password
    async checkPassword(password) {
      return await bcrypt.compare(password, this.password);
    }

    // Generate email verification code
    generateVerificationCode() {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      this.emailVerificationToken = code;
      return code;
    }

    // Verify email verification code
    verifyEmailCode(code) {
      if (!this.emailVerificationToken) {
        return false;
      }
      
      return this.emailVerificationToken === code;
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

    // Instance method to get candidate without password
    toJSON() {
      const values = Object.assign({}, this.get());
      delete values.password;
      delete values.resetPasswordToken;
      delete values.resetPasswordExpires;
      delete values.emailVerificationToken;
      return values;
    }
  }

  Candidate.init(
    {
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
      phone: {
        type: DataTypes.STRING,
        allowNull: true
      },
      location: {
        type: DataTypes.STRING,
        allowNull: true
      },
      bio: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      profile_picture: {
        type: DataTypes.STRING,
        allowNull: true
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      emailVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      lastLogin: {
        type: DataTypes.DATE,
        allowNull: true
      },
      resetPasswordToken: {
        type: DataTypes.STRING,
        allowNull: true
      },
      resetPasswordExpires: {
        type: DataTypes.DATE,
        allowNull: true
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
      modelName: "Candidate",
      tableName: "Candidates",
      hooks: {
        beforeCreate: async (candidate) => {
          if (candidate.password) {
            const salt = await bcrypt.genSalt(12);
            candidate.password = await bcrypt.hash(candidate.password, salt);
          }
        },
        beforeUpdate: async (candidate) => {
          if (candidate.changed('password')) {
            const salt = await bcrypt.genSalt(12);
            candidate.password = await bcrypt.hash(candidate.password, salt);
          }
        }
      }
    }
  );

  return Candidate;
};