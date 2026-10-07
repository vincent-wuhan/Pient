package com.pient.app

import androidx.lifecycle.Lifecycle
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.UiDevice
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class MainActivitySmokeTest {

    @Test
    fun mainActivityLaunchesAndStaysInForeground() {
        ActivityScenario.launch(MainActivity::class.java).use { scenario ->
            assertEquals(Lifecycle.State.RESUMED, scenario.state)

            val device = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation())
            assertEquals("com.pient.app", device.currentPackageName)
            assertTrue(device.hasObject(androidx.test.uiautomator.By.pkg("com.pient.app").depth(0)))
        }
    }
}
