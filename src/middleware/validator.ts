import { body, validationResult, query } from "express-validator";
import express from "express";

const notXSS = /^(?!.*<[^>]*>).*/;
const validUsername = /^[a-zA-Z0-9]+$/;
const noSpaces = /^\S*$/;

function validateResult(
  req: express.Request,
  res: express.Response,
  next: any,
) {
  try {
    const result = validationResult(req);
    if (result.isEmpty()) {
      return next();
    }
    return res.status(422).json({
      status: "error",
      errors: result.array(),
    });
  } catch (error) {
    console.error("[ERROR]: validation error occurred", error);
    next(error);
  }
}

function defineValidation(schema: any[]) {
  schema.push(validateResult);
  return schema;
}

export const validateSignup = defineValidation([
  body("first_name")
    .matches(notXSS)
    .matches(noSpaces)
    .notEmpty()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage("invalid first name")
    .escape(),
  body("last_name")
    .matches(notXSS)
    .matches(noSpaces)
    .notEmpty()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage("invalid last name")
    .escape(),
  body("email").isEmail().withMessage("invalid email was provided!"),
  body("username")
    .matches(notXSS)
    .matches(validUsername)
    .withMessage("username can only have letters and numbers")
    .notEmpty()
    .trim()
    .isLength({ min: 7, max: 50 })
    .withMessage(
      "username is required with minimum 7 characters and maximum 50 characters.",
    )
    .isLowercase()
    .withMessage("username should be in lowercase")
    .escape(),
  body("company")
    .matches(notXSS)
    .isLength({ min: 3, max: 100 })
    .withMessage("company name is required")
    .escape(),
  body("password")
    .isLength({ min: 7, max: 50 })
    .withMessage(
      "password is required, with minimum 7 characters and maximum 50 characters!",
    )
    .matches(noSpaces)
    .withMessage("password cannot have spaces")
    .isStrongPassword()
    .withMessage("password should be strong"),
]);

export const validateLogin = defineValidation([
  body("username_or_email")
    .matches(notXSS)
    .exists()
    .notEmpty()
    .trim()
    .isLength({ min: 1 })
    .withMessage("username or email is required!")
    .escape(),

  body("password")
    .exists()
    .notEmpty()
    .trim()
    .isLength({ min: 1 })
    .withMessage("password is required!")
    .escape(),
]);

export const validateBot = defineValidation([
  body("name")
    .matches(notXSS)
    .matches(noSpaces)
    .exists()
    .notEmpty()
    .withMessage("Bot name is required!")
    .trim()
    .isLowercase()
    .withMessage("Bot name should be in lowercase!")
    .escape(),

  body("description").optional().matches(notXSS).escape(),
  body("ai_provider")
    .matches(notXSS)
    .matches(noSpaces)
    .exists()
    .notEmpty()
    .withMessage("Ai provider is required!")
    .trim(),
  body("ai_model")
    .matches(notXSS)
    .matches(noSpaces)
    .exists()
    .notEmpty()
    .withMessage("Ai model is required!")
    .trim(),
  body("api_key")
    .matches(notXSS)
    .matches(noSpaces)
    .exists()
    .notEmpty()
    .withMessage("Api key for model is required!")
    .trim(),
]);

export const validateBotKnowledge = defineValidation([
  body("knowledge").exists(),
]);

export const validateHook = defineValidation([
  body("name")
    .matches(notXSS)
    .matches(noSpaces)
    .withMessage("hook name cannot have spaces!")
    .notEmpty()
    .trim()
    .isLength({ min: 3 })
    .withMessage("hook name is required!")
    .escape(),
  body("signal")
    .matches(notXSS)
    .notEmpty()
    .trim()
    .isLength({ min: 3 })
    .withMessage("hook signal is required"),
  body("api_calling"),
  body("url")
    .if(body("api_calling").equals("on"))
    .notEmpty()
    .matches(notXSS)
    .trim()
    .isLength({ min: 3 })
    .withMessage("hook url is required")
    .isURL({
      require_tld: false,
    })
    .withMessage("invalid hook url"),
  body("payload")
    .if(body("api_calling").equals("on"))
    .exists()
    .matches(notXSS)
    .isLength({ min: 2 })
    .withMessage("hook payload is required")
    .isJSON()
    .withMessage("hook payload should be in json format"),
  body("method")
    .if(body("api_calling").equals("on"))
    .exists()
    .matches(notXSS)
    .matches(noSpaces)
    .notEmpty()
    .isLength({ min: 3 })
    .withMessage("hook method is required")
    .escape(),
  body("headers")
    .if(body("api_calling").equals("on"))
    .exists()
    .matches(notXSS)
    .isLength({ min: 3 })
    .withMessage("hook headers are required")
    .isJSON()
    .withMessage("hook headers should be in json format"),
  body("response")
    .if(body("api_calling").isEmpty())
    .exists()
    .notEmpty()
    .withMessage("response is required"),
  body("rephrase").optional(),
]);

export const validateUpdatePassword = defineValidation([
  body("current_password")
    .matches(notXSS)
    .notEmpty()
    .matches(noSpaces)
    .withMessage("password cannot have spaces")
    .trim()
    .isLength({ min: 3 })
    .withMessage("current password is required with minimum length 3!")
    .escape(),
  body("new_password")
    .matches(notXSS)
    .notEmpty()
    .trim()
    .isLength({ min: 3 })
    .withMessage("current password is required with minimum length 3!")
    .escape(),
  body("confirm_new_password")
    .matches(notXSS)
    .matches(noSpaces)
    .withMessage("password cannot have spaces")
    .notEmpty()
    .trim()
    .isLength({ min: 3 })
    .withMessage("current password is required with minimum length 3!")
    .escape()
    .isStrongPassword()
    .withMessage("password should be strong"),
]);

export const validateResetPassword = defineValidation([
  body("new_password")
    .matches(notXSS)
    .matches(noSpaces)
    .withMessage("password cannot have spaces")
    .notEmpty()
    .trim()
    .isLength({ min: 7 })
    .withMessage("new password is required with minimum length 7!")
    .escape()
    .isStrongPassword()
    .withMessage("password should be strong"),
  body("confirm_new_password")
    .matches(notXSS)
    .matches(noSpaces)
    .withMessage("password cannot have spaces")
    .notEmpty()
    .trim()
    .isLength({ min: 7 })
    .withMessage("confirm new password is required with minimum length 7!")
    .escape()
    .isStrongPassword()
    .withMessage("password should be strong"),
]);

export const validateUpdateUser = defineValidation([
  body("first_name")
    .optional()
    .matches(notXSS)
    .matches(noSpaces)
    .notEmpty()
    .trim()
    .escape(),
  body("last_name")
    .optional()
    .matches(notXSS)
    .matches(noSpaces)
    .notEmpty()
    .trim()
    .escape(),
  body("username")
    .optional()
    .matches(notXSS)
    .matches(validUsername)
    .withMessage("username can only have letters and numbers")
    .notEmpty()
    .trim()
    .isLength({ min: 7 })
    .withMessage("confirm new password is required with minimum length 7!")
    .escape(),
]);
