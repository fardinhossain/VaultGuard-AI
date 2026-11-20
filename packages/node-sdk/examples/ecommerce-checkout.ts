import { VaultGuardApiError, VaultGuardClient } from '../src/index.js';

async function main() {
  const endpoint = process.env.VAULTGUARD_API_URL || 'http://localhost:4000/v1';
  console.log(`\n[VaultGuard SDK Demo] Connecting to ${endpoint}...\n`);

  const checkoutClient = new VaultGuardClient({
    endpoint,
    tenantId: 'tenant_supershop_bd',
    actorId: 'checkout_service_01',
    actorRole: 'delivery',
  });

  // 1. Encrypt customer checkout payload
  const encrypted = await checkoutClient.encrypt({
    name: 'Tasnim Tabassum',
    phone: '01799887766',
    email: 'tasnim.sdk@example.com',
    address: 'House 22, Road 4, Bashundhara R/A, Dhaka',
    orderTotal: '৳5,420',
  });
  console.log('1) Encrypted customer PII (AES-256-GCM):', {
    recordId: encrypted.recordId,
    keyVersion: encrypted.keyVersion,
    ciphertextPreview: encrypted.ciphertextPreview,
    latencyMs: encrypted.latencyMs,
  });

  // 2. Exact-match lookup via formatted BD phone blind index (+8801799-887766)
  const search = await checkoutClient.searchByPhone('+8801799-887766');
  console.log('2) Blind-index phone lookup (+8801799-887766):', {
    matchCount: search.matchCount,
    phoneBlindIndex: search.phoneBlindIndex.slice(0, 20) + '...',
    matchedRecordIds: search.records.map((r) => r.recordId),
  });
  if (search.matchCount === 0) {
    throw new Error('Expected blind-index search to match encrypted record!');
  }

  // 3. Delivery role decrypts (name, phone, address visible; email & orderTotal masked)
  const deliveryView = await checkoutClient.decrypt(encrypted.recordId, {
    purpose: 'ORDER_DELIVERY',
  });
  console.log('3) Delivery Agent redacted decrypt:', deliveryView.data);
  if (
    deliveryView.data.email !== '[REDACTED_BY_POLICY]' ||
    deliveryView.data.orderTotal !== '[REDACTED_BY_POLICY]'
  ) {
    throw new Error('Expected email and orderTotal to be redacted for delivery role!');
  }

  // 4. Marketing role attempts decrypt -> must fail closed with 403
  const marketingClient = checkoutClient.withRole('marketing', 'marketing_sdk_01');
  try {
    await marketingClient.decrypt(encrypted.recordId, { purpose: 'ANALYTICS' });
    throw new Error('Expected marketing role decrypt to be rejected with 403!');
  } catch (err) {
    if (err instanceof VaultGuardApiError && err.status === 403) {
      console.log('4) Marketing Analyst blocked (403 Forbidden):', {
        errorCode: err.errorCode,
        sentinelRiskImpact: err.sentinelRiskImpact,
      });
    } else {
      throw err;
    }
  }

  // 5. Admin role decrypts full record
  const adminClient = checkoutClient.withRole('admin', 'admin_sdk_01');
  const adminView = await adminClient.decrypt(encrypted.recordId, {
    purpose: 'ADMIN_AUDIT',
  });
  console.log('5) Admin full authorized decrypt:', adminView.data);

  // 6. Verify hash-chained audit trail
  const chain = await adminClient.verifyAuditChain();
  console.log('6) Hash-chained audit integrity:', chain);
  if (!chain.valid) {
    throw new Error('Audit hash chain failed integrity check!');
  }

  console.log('\n[VaultGuard SDK Demo] All 6 SDK checks passed cleanly!\n');
}

main().catch((err) => {
  console.error('[VaultGuard SDK Demo] FAILED:', err);
  process.exit(1);
});
