import { VaultGuardApiError, VaultGuardClient } from '../src/index.js';

async function mintScopedKey(
  endpoint: string,
  name: string,
  roleScope: 'admin' | 'delivery' | 'marketing',
): Promise<{ keyId: string; rawKey: string; keyPrefix: string }> {
  const res = await fetch(`${endpoint}/api-keys`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': 'tenant_supershop_bd',
      'x-actor-role': 'admin',
      'x-actor-id': 'merchant_portal_admin',
    },
    body: JSON.stringify({ name, roleScope }),
  });
  const data = (await res.json()) as {
    apiKey: { keyId: string; keyPrefix: string };
    rawKey: string;
  };
  if (!res.ok) {
    throw new Error(`Failed to mint ${roleScope} API key: ${JSON.stringify(data)}`);
  }
  return { keyId: data.apiKey.keyId, rawKey: data.rawKey, keyPrefix: data.apiKey.keyPrefix };
}

async function revokeKey(endpoint: string, keyId: string) {
  const res = await fetch(`${endpoint}/api-keys/${encodeURIComponent(keyId)}/revoke`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': 'tenant_supershop_bd',
      'x-actor-role': 'admin',
      'x-actor-id': 'merchant_portal_admin',
    },
    body: '{}',
  });
  if (!res.ok) {
    throw new Error(`Failed to revoke key ${keyId}`);
  }
}

async function main() {
  const endpoint = process.env.VAULTGUARD_API_URL || 'http://localhost:4000/v1';
  console.log(`\n[SuperShop Own-DB Demo] Connecting to VaultGuard at ${endpoint}...\n`);

  // 1. Store owner generates scoped API keys in VaultGuard dashboard
  const adminKey = await mintScopedKey(endpoint, 'SuperShop Checkout Admin Key', 'admin');
  const deliveryKey = await mintScopedKey(endpoint, 'Delivery Rider App Key', 'delivery');
  const marketingKey = await mintScopedKey(endpoint, 'Marketing Analytics Key', 'marketing');

  console.log('1) Minted 3 scoped VaultGuard API keys:', {
    admin: adminKey.keyPrefix,
    delivery: deliveryKey.keyPrefix,
    marketing: marketingKey.keyPrefix,
  });

  // 2. SuperShop plugs its Admin API key into its OWN backend + OWN database table
  const vault = new VaultGuardClient({ endpoint, apiKey: adminKey.rawKey });
  const merchantOrdersTable: Array<Record<string, unknown>> = [];

  const protectedOrder = await vault.protectDocument(
    {
      orderNumber: 'ORD-SHOP-9921',
      itemsSummary: '2x Organic Ghee, 1x Basmati Rice',
      name: 'Zarin Tasnim',
      phone: '01788112233',
      email: 'zarin.shopper@example.com',
      address: 'Road 16, Mirpur 10, Dhaka',
      orderTotal: '৳4,150',
    },
    {
      sensitiveFields: ['name', 'phone', 'email', 'address', 'orderTotal'],
      blindIndexFields: ['phone'],
    },
  );

  // Saved strictly inside SuperShop's OWN DB!
  merchantOrdersTable.push(protectedOrder);

  const rawDumpJson = JSON.stringify(merchantOrdersTable);
  if (
    rawDumpJson.includes('Zarin') ||
    rawDumpJson.includes('01788112233') ||
    rawDumpJson.includes('Mirpur')
  ) {
    throw new Error('CRITICAL: Plaintext leaked into merchant DB document!');
  }
  console.log('2) Saved encrypted order into SuperShop OWN DB (0 plaintext fields stored):', {
    orderNumber: protectedOrder.orderNumber,
    ciphertextPreview: `${protectedOrder._vaultguard.ciphertext.slice(0, 18)}...`,
    phoneBlindIndex: `${protectedOrder.blindIndexes.phone?.slice(0, 18)}...`,
  });

  // 3. Exact-match lookup inside SuperShop's OWN DB using blind index
  const { blindIndex } = await vault.createBlindIndex('+8801788-112233', 'phone');
  const matchedOrder = merchantOrdersTable.find(
    (row) => (row.blindIndexes as Record<string, string>)?.phone === blindIndex,
  ) as (typeof protectedOrder) | undefined;

  if (!matchedOrder) {
    throw new Error('Expected blind-index lookup in merchant DB to find protected order!');
  }
  console.log('3) Blind-index search inside SuperShop DB matched:', matchedOrder.orderNumber);

  // 4. Delivery Rider app decrypts with Delivery API key (email & orderTotal masked)
  const deliveryClient = vault.withApiKey(deliveryKey.rawKey);
  const deliveryView = await deliveryClient.unprotectDocument(matchedOrder, {
    purpose: 'ORDER_DELIVERY',
  });
  console.log('4) Delivery API Key view (field-masked):', {
    name: deliveryView.name,
    phone: deliveryView.phone,
    email: deliveryView.email,
    orderTotal: deliveryView.orderTotal,
  });
  if (
    deliveryView.email !== '[REDACTED_BY_POLICY]' ||
    deliveryView.orderTotal !== '[REDACTED_BY_POLICY]'
  ) {
    throw new Error('Delivery API key did not redact sensitive fields!');
  }

  // 5. Marketing API key attempts decrypt -> blocked 403
  const marketingClient = vault.withApiKey(marketingKey.rawKey);
  try {
    await marketingClient.unprotectDocument(matchedOrder, { purpose: 'ANALYTICS' });
    throw new Error('Marketing API key should be blocked with 403!');
  } catch (err) {
    if (err instanceof VaultGuardApiError && err.status === 403) {
      console.log('5) Marketing API Key blocked (403 Forbidden):', err.errorCode);
    } else {
      throw err;
    }
  }

  // 6. Admin API key decrypts full order
  const adminView = await vault.unprotectDocument(matchedOrder, { purpose: 'ADMIN_AUDIT' });
  console.log('6) Admin API Key full recovery:', {
    name: adminView.name,
    email: adminView.email,
    orderTotal: adminView.orderTotal,
  });

  // 7. Revoke Admin API key -> subsequent decrypt must fail immediately with 401
  await revokeKey(endpoint, adminKey.keyId);
  try {
    await vault.unprotectDocument(matchedOrder, { purpose: 'ADMIN_AUDIT' });
    throw new Error('Revoked API key should be rejected with 401!');
  } catch (err) {
    if (err instanceof VaultGuardApiError && err.status === 401) {
      console.log('7) Revoked API key immediately rejected (401):', err.errorCode);
    } else {
      throw err;
    }
  }

  console.log('\n[SuperShop Own-DB Demo] All 7 external-DB API-key checks passed!\n');
}

main().catch((err) => {
  console.error('[SuperShop Own-DB Demo] FAILED:', err);
  process.exit(1);
});
