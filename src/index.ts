import { } from "ask-sdk";
import { Response, IntentRequest } from "ask-sdk-model";
import { APLHomeCardRequestInterceptor } from "./aplcard";
import { RequestHandler, HandlerInput, ErrorHandler, SkillBuilders, RequestInterceptor, ResponseInterceptor } from "ask-sdk-core";
// tslint:disable-next-line: no-var-requires
const modules = require("./modules") as { game: IGameModule[] };

const persistenceAdapter = getPersistenceAdapter("si-mi-capitan");

interface ISessionAttributes {
    id: number;
    reputacion: number;
    tesoro: number;
    vuelt: number;
    [key: string]: any;
}

class LaunchRequestHandler implements RequestHandler {
    public canHandle(handlerInput: HandlerInput): boolean {
        return handlerInput.requestEnvelope.request.type === "LaunchRequest";
    }
    public handle(handlerInput: HandlerInput): Response {
        const { attributesManager } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes() as ISessionAttributes;
        sessionAttributes.id = 1;
        sessionAttributes.reputacion = 50;
        sessionAttributes.tesoro = 50;
        sessionAttributes.vueltas = 0;
        const module = getModule(1);
        const speechText = module.question;
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .withStandardCard("Sí mi Capitán", module.question, module.image) // <--
            .getResponse();
    }
}

class YesIntentHandler implements RequestHandler {
    public canHandle(handlerInput: HandlerInput): boolean {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "AMAZON.YesIntent";
    }
    public handle(handlerInput: HandlerInput): Response {
        const { attributesManager } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes() as ISessionAttributes;
        const moduleId = sessionAttributes.id;
        const module = getModule(moduleId);
        const nextModule = getNextModule(moduleId);
        if (nextModule) { sessionAttributes.id = nextModule.id; }
        let speechText;
        calculateGameVariables(sessionAttributes, module.yes.variable1, module.yes.variable2);
        if (sessionAttributes.reputacion === 100 || sessionAttributes.reputacion === 0 || sessionAttributes.tesoro === 100 || sessionAttributes.tesoro === 0) {
            speechText = "Tu reputación es de " + sessionAttributes.reputacion + " y tu tesoro de " + sessionAttributes.tesoro + ". Lamentablemente no has sobrevivido al viaje! Inténtalo otra vez! Hasta la próxima!";
            return handlerInput.responseBuilder
                .speak(speechText)
                .getResponse();
        }
        speechText = module.yes.answer;
        if (module.yes.warning) {
            speechText += module.yes.warning;
        }
        if (module.audio) {
            speechText += module.audio;
        }
        if (nextModule) {
            speechText += nextModule.question;
            handlerInput.responseBuilder.reprompt(speechText);
        }

        return handlerInput.responseBuilder
            .speak(speechText)
            .getResponse();
    }
}

class NoIntentHandler implements RequestHandler {
    public canHandle(handlerInput: HandlerInput): boolean {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "AMAZON.NoIntent";
    }
    public handle(handlerInput: HandlerInput): Response {
        const { attributesManager } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes() as ISessionAttributes;
        const moduleId = sessionAttributes.id;
        const module = getModule(moduleId);
        const nextModule = getNextModule(moduleId);
        if (nextModule) { sessionAttributes.id = nextModule.id; }
        let speechText;
        calculateGameVariables(sessionAttributes, module.no.variable1, module.no.variable2);
        if (sessionAttributes.reputacion === 100 || sessionAttributes.reputacion === 0 || sessionAttributes.tesoro === 100 || sessionAttributes.tesoro === 0) {
            speechText = "Tu reputación es de " + sessionAttributes.reputacion + " y tu tesoro de " + sessionAttributes.tesoro + ". Lamentablemente no has sobrevivido al viaje! Inténtalo otra vez! Hasta la próxima!";
            return handlerInput.responseBuilder
                .speak(speechText)
                .getResponse();
        }
        speechText = module.no.answer;
        module.no.warning ? speechText += module.no.warning : speechText;
        if (module.audio) {
            speechText += module.audio;
        }
        if (nextModule) {
            speechText += nextModule.question;
            handlerInput.responseBuilder.reprompt(speechText);
        }

        return handlerInput.responseBuilder
            .speak(speechText)
            .getResponse();
    }
}

class HelpIntentHandler implements RequestHandler {
    public canHandle(handlerInput: HandlerInput): boolean {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && handlerInput.requestEnvelope.request.intent.name === "AMAZON.HelpIntent";
    }
    public handle(handlerInput: HandlerInput): Response {
        const speechText = "Solo tienes que contestar si o no durante el juego. Elige con sabiduría!";

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
}

class CancelAndStopIntentHandler implements RequestHandler {
    public canHandle(handlerInput: HandlerInput): boolean {
        return handlerInput.requestEnvelope.request.type === "IntentRequest"
            && (handlerInput.requestEnvelope.request.intent.name === "AMAZON.CancelIntent"
                || handlerInput.requestEnvelope.request.intent.name === "AMAZON.StopIntent");
    }
    public handle(handlerInput: HandlerInput): Response {
        const { attributesManager } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes() as ISessionAttributes;

        const speechText = "Tu reputación fue de " + sessionAttributes.reputacion + " y tu tesoro de " + sessionAttributes.tesoro + ". Al salir te has caído por la borda así que tendrás que volver a empezar! Hasta la próxima!";

        return handlerInput.responseBuilder
            .speak(speechText)
            .getResponse();
    }
}

class SessionEndedRequestHandler implements RequestHandler {
    public canHandle(handlerInput: HandlerInput): boolean {
        return handlerInput.requestEnvelope.request.type === "SessionEndedRequest";
    }
    public handle(handlerInput: HandlerInput): Response {
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse();
    }
}

// The intent reflector is used for interaction model testing and debugging.
// It will simply repeat the intent the user said. You can create custom handlers
// for your intents by defining them above, then also adding them to the request
// handler chain below.
class IntentReflectorHandler implements RequestHandler {
    public canHandle(handlerInput: HandlerInput): boolean {
        return handlerInput.requestEnvelope.request.type === "IntentRequest";
    }
    public handle(handlerInput: HandlerInput): Response {
        const intentName = (handlerInput.requestEnvelope.request as IntentRequest).intent.name;
        const speechText = `Acabas de activar ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speechText)
            // .reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
}

// Generic error handling to capture any syntax or routing errors. If you receive an error
// stating the request handler chain is not found, you have not implemented a handler for
// the intent being invoked or included it in the skill builder below.
class CustomErrorHandler implements ErrorHandler {
    public canHandle(): boolean {
        return true;
    }
    public handle(handlerInput: HandlerInput, error: Error): Response {
        console.log(`~~~~ Error handled: ${error.message}`);
        const speechText = `Hubo un error. por favor inténtalo otra vez.`;

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
}

interface IYesNoOption {
    variable1: number;
    variable2: number;
    answer: string;
    warning: string;
}

interface IGameModule {
    id: number;
    image: string;
    audio: string;
    question: string;
    yes: IYesNoOption;
    no: IYesNoOption;
    targets: number[];
}

function getRandom<T>(arrayOfItems: T[]) {
    let i = 0;
    i = Math.floor(Math.random() * arrayOfItems.length);
    return (arrayOfItems[i]);
}

function getModule(moduleId: number) {
    return modules.game.filter((module) => module.id === moduleId)[0];
}

function getNextModule(moduleId: number) {
    const module = getModule(moduleId);
    if (module.targets.length === 0) { return null; }
    const nextTarget = getRandom(module.targets);
    return getModule(nextTarget);
}

function calculateGameVariables(sessionAttributes: ISessionAttributes, reputacionDif: number, tesoroDif: number) {
    sessionAttributes.reputacion += reputacionDif;
    sessionAttributes.tesoro += tesoroDif;
    console.log(sessionAttributes);
}

// This handler acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.

function getPersistenceAdapter(tableName?: string) {
    // This function is an indirect way to detect if this is part of an Alexa-Hosted skill
    function isAlexaHosted() {
        return process.env.S3_PERSISTENCE_BUCKET;
    }
    if (isAlexaHosted()) {
        // tslint:disable-next-line: no-implicit-dependencies
        const { S3PersistenceAdapter } = require("ask-sdk-s3-persistence-adapter");
        return new S3PersistenceAdapter({
            bucketName: process.env.S3_PERSISTENCE_BUCKET,
        });
    } else {
        // IMPORTANT: don't forget to give DynamoDB access to the role you're to run this lambda (IAM)
        // tslint:disable-next-line: no-implicit-dependencies
        const { DynamoDbPersistenceAdapter } = require("ask-sdk-dynamodb-persistence-adapter");
        return new DynamoDbPersistenceAdapter({
            tableName,
            createTable: true,
        });
    }
}

class LoadAttributesRequestInterceptor implements RequestInterceptor {
    public async process(handlerInput: HandlerInput) {
        const { attributesManager, requestEnvelope } = handlerInput;
        if (requestEnvelope.session && requestEnvelope.session.new) { // is this a new session? this check is not enough if using auto-delegate
            const persistentAttributes = await attributesManager.getPersistentAttributes() || {};
            // copy persistent attribute to session attributes
            attributesManager.setSessionAttributes(persistentAttributes);
        }
    }
}

class SaveAttributesResponseInterceptor implements ResponseInterceptor {
    public async process(handlerInput: HandlerInput, response: Response) {
        if (!response) { return; } // avoid intercepting calls that have no outgoing response due to errors
        const { attributesManager, requestEnvelope } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const shouldEndSession = (typeof response.shouldEndSession === "undefined" ? true : response.shouldEndSession); // is this a session end?
        if (shouldEndSession || requestEnvelope.request.type === "SessionEndedRequest") { // skill was stopped or timed out
            attributesManager.setPersistentAttributes(sessionAttributes);
            await attributesManager.savePersistentAttributes();
        }
    }
}

const skillBuilders = SkillBuilders.custom();
exports.handler = skillBuilders.addRequestHandlers(
    new LaunchRequestHandler(),
    new YesIntentHandler(),
    new NoIntentHandler(),
    new HelpIntentHandler(),
    new CancelAndStopIntentHandler(),
    new SessionEndedRequestHandler(),
    new IntentReflectorHandler()) // make sure IntentReflectorHandler is last so it doesn't override your custom intent handler()s
    // tslint:disable-next-line: no-var-requires
    .addRequestInterceptors(new APLHomeCardRequestInterceptor(), new LoadAttributesRequestInterceptor())
    .addResponseInterceptors(new SaveAttributesResponseInterceptor())
    .addErrorHandlers(new CustomErrorHandler())
    .withPersistenceAdapter(persistenceAdapter)
    .lambda();
