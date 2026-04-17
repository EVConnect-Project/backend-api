<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Wallet Card Setup Configuration

To enable hosted card tokenization (wallet-only add card flow), configure these environment variables:

- `PAYHERE_CARD_SETUP_URL`: Hosted card setup page URL provided by your payment gateway/tokenization service.
- `MOBILE_CARD_SETUP_CALLBACK_URL`: Callback URL used by the mobile app to capture tokenized card details. Default: `evconnect://wallet/card-setup`.

The hosted setup page should redirect to the callback URL with query parameters:

- `token`
- `lastFour`
- `expiryMonth`
- `expiryYear`
- `cardBrand` (optional)

Example callback:

`evconnect://wallet/card-setup?token=tok_xxx&lastFour=4242&expiryMonth=12&expiryYear=29&cardBrand=Visa`

If `PAYHERE_CARD_SETUP_URL` is not configured, the app falls back to the local manual entry flow.

## SMS OTP Configuration (Text.lk)

OTP signup, OTP login verification, and forgot-password OTP flows in the backend auth module use Text.lk.

Set the following environment variables in your backend runtime environment:

- `TEXTLK_API_TOKEN`: API token from Text.lk dashboard.
- `TEXTLK_SENDER_ID`: Approved sender id (example: `EVRS`).
- `TEXTLK_OAUTH_API_ENDPOINT`: Base OAuth API endpoint. Default: `https://app.text.lk/api/v3/`
- `TEXTLK_HTTP_API_ENDPOINT`: Base HTTP API endpoint fallback. Default: `https://app.text.lk/api/http/`
- `SMS_APP_NAME`: Optional app name injected into welcome template. Default: `EVRS`
- `TEXTLK_WELCOME_MESSAGE_TEMPLATE`: Optional welcome SMS template. Supports placeholders `{{name}}` and `{{appName}}`.
- `TEXTLK_ACCOUNT_DELETED_MESSAGE_TEMPLATE`: Optional account-deleted SMS template. Supports placeholders `{{name}}` and `{{appName}}`.

Example template:

`Hi {{name}}, welcome to {{appName}}! We're happy to have you on board.`

Account deletion template example:

`Hi {{name}}, your account is successfully deleted from {{appName}}.`

How delivery works:

- Primary: OAuth endpoint (`POST /sms/send`) with `Authorization: Bearer <token>`.
- Fallback: HTTP endpoint (`GET /sms/send`) with query params.

Security notes:

- Do not commit API tokens to source control.
- Rotate tokens immediately if they are shared in chats, logs, or screenshots.

## Trip Planner Routes API

### Endpoint

`GET /trip-planner/routes`

### Required Query Params

- `origin`: `lat,lng`
- `destination`: `lat,lng`

### Optional Query Params

- `vehicleId`
- `currentBatteryPercent`
- `waypoints`: `lat,lng|lat,lng|...`
- `startAddress`
- `destAddress`
- `preferredNetworks`: comma-separated keywords
- `excludedNetworks`: comma-separated keywords
- `ambientTemperatureC`
- `windSpeedKph`
- `elevationDeltaM`
- `hvacLoadKw`
- `drivingMode`: `eco|normal|sport`
- `routeObjective`: `fastest|balanced|cheapest`
- `minChargeAtChargingStationPercent`
- `targetBatteryPercent`

### Example

```bash
curl --request GET \
  'http://localhost:3000/trip-planner/routes?origin=6.9271,79.8612&destination=7.2906,80.6337&currentBatteryPercent=78&drivingMode=normal&routeObjective=balanced&preferredNetworks=chargefast,evpoint&waypoints=6.98,79.9|7.1,80.2' \
  --header 'Authorization: Bearer <JWT>'
```

### Response Shape

```json
{
  "routes": [
    {
      "id": "1",
      "distance": "48.9 km",
      "duration": "92 min",
      "polyline": "<encoded_polyline>",
      "chargingStops": []
    }
  ],
  "bestRouteId": "1"
}
```

### Notes

- Charging stops are sourced from system chargers (`chargers` table), not external Open Charge Map lookups.
- Route geometry must be road-based (Google/OSRM polyline); direct straight-line fallback is disabled.

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License
## Support
Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
