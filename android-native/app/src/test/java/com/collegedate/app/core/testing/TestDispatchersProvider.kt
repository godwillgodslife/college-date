package com.collegedate.app.core.testing

import com.collegedate.app.core.common.DispatchersProvider
import kotlinx.coroutines.CoroutineDispatcher

class TestDispatchersProvider(
    private val dispatcher: CoroutineDispatcher,
) : DispatchersProvider {
    override val default: CoroutineDispatcher = dispatcher
    override val io: CoroutineDispatcher = dispatcher
    override val main: CoroutineDispatcher = dispatcher
}
