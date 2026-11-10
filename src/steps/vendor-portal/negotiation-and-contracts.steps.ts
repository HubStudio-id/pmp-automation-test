// Vendor · Katalog › Negosiasi Saya (NEG-01, the admin side opens the same code; NEG-02 attachment size limit).
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '../../support/bdd-expect';
import type { RegressionWorld } from '../../support/world';
import { VendorNegotiationsPage, VendorNegotiationRoomPage } from '../../pages';
import { data, urls } from '../../testdata';
import { vendorGet } from '../../utils/vendor-api';
import { pdfOfSize } from '../../utils/files';

Given("the vendor's first negotiation code is read from «Negosiasi Saya»", async function (this: RegressionWorld) {
  // NEG-01 verifies negotiation data, not sidebar navigation. Open the stable list route directly so a menu
  // collapse/label change cannot mask the cross-portal assertion with a locator timeout.
  const negotiations = await new VendorNegotiationsPage(this.f).open();
  const [code] = await negotiations.codes();
  expect(code, 'precondition: QA-DIST Distributor A has a negotiation in «Negosiasi Saya»').toBeTruthy();
  this.stash.negotiationCode = code;
});


// ---- NEG-02 (PMP-731): an attachment at the 10 MB limit is sent; one byte more is refused ----
const LIMIT = data.negotiationAttachment.limitBytes as number;
const SENT = [200, 201];

Given('the QA negotiation room is open in «Negosiasi Saya»', async function (this: RegressionWorld) {
  const code = data.negotiationAttachment.openCode;
  await this.f.app.open(`${urls.vendor}/dashboard`);
  const negotiation = await vendorGet(this.f.browser, `/vendor/negotiations/${code}`);
  expect(negotiation.body?.data?.status, `precondition: ${code} is still open (reserved for NEG-02; a completed one needs a new QA proposal)`).not.toBe('completed');
  this.stash.room = await new VendorNegotiationRoomPage(this.f).open(code);
});
When('a message with a PDF of exactly 10 MB is sent', async function (this: RegressionWorld) {
  const fileName = `qa-neg02-${Date.now()}.pdf`;
  await this.stash.room.attach(pdfOfSize(fileName, LIMIT));
  await this.stash.room.typeMessage(`${data.negotiationAttachment.messagePrefix} ${new Date().toISOString()}`);
  this.stash.sentFile = fileName;
  this.stash.sendStatus = await this.stash.room.send();
});
Then('the message is accepted with its attachment', async function (this: RegressionWorld) {
  expect(SENT).toContain(this.stash.sendStatus);
  await expect(this.stash.room.chatLog.getByText(this.stash.sentFile).first()).toBeVisible();
});
When('a PDF one byte over 10 MB is attached', async function (this: RegressionWorld) {
  this.stash.messagePosts = 0;
  this.page.on('request', (request) => {
    if (request.method() === 'POST' && /\/vendor\/negotiations\/[^/]+\/messages/.test(request.url())) this.stash.messagePosts += 1;
  });
  await this.stash.room.attach(pdfOfSize(`qa-neg02-over-${Date.now()}.pdf`, LIMIT + 1));
});
Then('the size alert is shown and nothing is sent', async function (this: RegressionWorld) {
  await expect(this.stash.room.attachmentTooLargeAlert).toBeVisible();
  await expect(this.stash.room.attachmentTooLargeAlert).toHaveText(data.negotiationAttachment.tooLargeAlert);
  expect(this.stash.messagePosts, 'no message request leaves the browser').toBe(0);
});
