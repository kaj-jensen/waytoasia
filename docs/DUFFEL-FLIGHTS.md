# Flight itinerary testing

Staff dashboard enquiries include a Flight itinerary section for administrators and Sales. Use **Try sample itinerary** without a provider account, or search Duffel after configuring a test token. Choose **This enquiry only** or **Enquiry and current proposal**, then save an itinerary. Proposal saves create a draft version, preserve previous snapshots and update the existing customer link immediately. Saved schedules stay attached even after a provider offer expires. Removal uses the same destination selector.

Flight searches support one-way and return journeys, adult counts and cabin class. Each connection is retained as a separate segment, with local departure/arrival times and marketing flight numbers. Children and multi-city searches are not yet supported. No booking, payment, order creation or flight price is added to the journey price. Every sample/test itinerary is clearly marked unconfirmed in all proposal locales. Test data must not be used as real travel instructions.

## Connect Duffel securely

1. Create an account at https://app.duffel.com/ and select Developer test mode.
2. Create a test access token (starts with `duffel_test_`).
3. In Cloudflare, verify Pages project **waytoasia** and its waytoasia.com / proposal.waytoasia.com domains. Add an encrypted production secret named `DUFFEL_TEST_TOKEN` via Pages settings, and redeploy the matching source. Configure a separate preview secret if needed. Never paste tokens in chat or commit them.
4. Open an enquiry in https://proposal.waytoasia.com/dashboard and search future dates using airport codes, e.g. CPH to BKK.
5. Verify actual API results, save to a separate test journey, then inspect the customer proposal. The integration rejects live tokens and live responses.

The AI Journey Designer automatically searches test flights after generating its route, using a recognised departure airport, first and last route airports, dates and adult count. It checks same-day and preceding-day outbound departures for arrival on the journey start date, supports returning from a different final airport, and ranks matching offers by fewer connections and shorter flying time. Travellers can choose among up to three suggestions or omit flights. The selected itinerary travels with the enquiry and customer proposal. Missing credentials, ambiguous airports, children or unsuccessful searches produce an honest status without blocking journey generation. Flexible date searches and child passenger support are not yet implemented.

All provider calls run on the server. Staff operations use existing role, origin and request-size checks; no traveller names, emails or passport information are sent to Duffel. Selection retrieves the offer again from Duffel, rather than trusting client-supplied itinerary fields. Only offer search and retrieval endpoints are implemented.

Provider documentation: https://duffel.com/docs/api/overview/test-mode/duffel-airways and https://duffel.com/docs/api/v2/offer-requests/create-offer-request.
