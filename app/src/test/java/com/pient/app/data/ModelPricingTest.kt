package com.pient.app.data

import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class ModelPricingTest {

    @Test
    fun loadsBuiltinPricingTableFromAssets() {
        val context = ApplicationProvider.getApplicationContext<android.content.Context>()

        ModelPricingDefaults.load(context)

        assertTrue(ModelPricingDefaults.rowCount() > 100)
    }

    @Test
    fun findsExactProviderModelPricing() {
        val context = ApplicationProvider.getApplicationContext<android.content.Context>()
        ModelPricingDefaults.load(context)

        val pricing = ModelPricingDefaults.defaultFor("zai-coding-cn", "glm-4.6")

        assertEquals(BillingMode.TOKEN, pricing.billingMode)
        assertEquals(PricingCurrency.CNY, pricing.currency)
        assertEquals(1.2, pricing.inputPerMillion, 0.000001)
        assertEquals(4.8, pricing.outputPerMillion, 0.000001)
    }

    @Test
    fun convertsUsdPricingToCny() {
        assertEquals(
            72.0,
            toCny(10.0, PricingCurrency.USD, ModelPricingDefaults.DEFAULT_USD_TO_CNY_RATE),
            0.000001,
        )
        assertEquals(10.0, toCny(10.0, PricingCurrency.CNY, 7.2), 0.000001)
    }
}
