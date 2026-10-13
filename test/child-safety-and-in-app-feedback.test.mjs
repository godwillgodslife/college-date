import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

test('Google Play Child Safety Compliance: REPORT_REASONS includes explicit child_safety option', () => {
    const reportServicePath = resolve('src/services/reportService.js');
    assert.strictEqual(existsSync(reportServicePath), true);
    const content = readFileSync(reportServicePath, 'utf8');

    assert.ok(content.includes("'child_safety'"), 'REPORT_REASONS must include child_safety id');
    assert.ok(content.includes('Child Safety / Underage Account'), 'Label must mention Child Safety / Underage Account');
    assert.ok(content.includes('CSAM') && content.includes('CSAE'), 'Description must explicitly cite CSAM and CSAE');
});

test('In-App Feedback Mechanism: FEEDBACK_CATEGORIES and submitInAppFeedback service', () => {
    const feedbackServicePath = resolve('src/services/feedbackService.js');
    assert.strictEqual(existsSync(feedbackServicePath), true);
    const content = readFileSync(feedbackServicePath, 'utf8');

    assert.ok(content.includes("'child_safety'"), 'FEEDBACK_CATEGORIES must contain child_safety');
    assert.ok(content.includes("'safety_harassment'"), 'FEEDBACK_CATEGORIES must contain safety_harassment');
    assert.ok(content.includes("'feedback_suggestion'"), 'FEEDBACK_CATEGORIES must contain feedback_suggestion');
    assert.ok(content.includes('URGENT'), 'Child safety category must be tagged URGENT');
    assert.ok(content.includes('export async function submitInAppFeedback'), 'Must export submitInAppFeedback function');
    assert.ok(content.includes("rpc('submit_in_app_feedback'"), 'Must call submit_in_app_feedback RPC');
    assert.ok(content.includes('from(\'in_app_feedback\')'), 'Must have fallback direct table insert');
    assert.ok(content.includes('tcd_pending_inapp_feedback'), 'Must have offline resilience queue');
    assert.ok(content.includes('TCD-'), 'Must generate TCD- ticket reference for in-app receipt');
});

test('InAppFeedbackModal Component: In-app feedback without leaving the app', () => {
    const modalPath = resolve('src/components/InAppFeedbackModal.jsx');
    const cssPath = resolve('src/components/InAppFeedbackModal.css');
    assert.strictEqual(existsSync(modalPath), true, 'InAppFeedbackModal.jsx must exist');
    assert.strictEqual(existsSync(cssPath), true, 'InAppFeedbackModal.css must exist');

    const content = readFileSync(modalPath, 'utf8');
    assert.ok(content.includes('submitInAppFeedback'), 'Modal must invoke submitInAppFeedback');
    assert.ok(content.includes('Child Safety & Protection Report') || content.includes('child_safety'), 'Modal must have child safety mode');
    assert.ok(content.includes('Zero Tolerance Policy'), 'Modal must show zero tolerance policy alert for CSAE/CSAM');
    assert.ok(content.includes('ticketRef'), 'Modal must show reference ticket to user');
    assert.ok(content.includes('Done & Return to App'), 'Modal must allow return to app without leaving');
});

test('Google Play Published Standards: public/child-safety-standards.html complies with all policy requirements', () => {
    const filePath = resolve('public/child-safety-standards.html');
    assert.strictEqual(existsSync(filePath), true, 'child-safety-standards.html must exist');
    const content = readFileSync(filePath, 'utf8');

    // 1. Explicit app and developer reference
    assert.ok(content.includes('The College Date'), 'Must reference app name The College Date');
    assert.ok(content.includes('com.collegedate.app'), 'Must reference package com.collegedate.app');
    assert.ok(content.includes('Neway Marketing Enterprises'), 'Must reference developer Neway Marketing Enterprises');

    // 2. Explicit prohibition of CSAE and CSAM
    assert.ok(content.includes('Child Sexual Abuse and Exploitation') || content.includes('CSAE'), 'Must prohibit CSAE');
    assert.ok(content.includes('Child Sexual Abuse Material') || content.includes('CSAM'), 'Must prohibit CSAM');
    assert.ok(content.includes('zero-tolerance'), 'Must declare zero-tolerance');

    // 3. Strict 18+ policy
    assert.ok(content.includes('18'), 'Must state 18+ age restriction');

    // 4. In-app mechanism for user feedback without leaving the app
    assert.ok(
        content.includes('without leaving the app') || content.includes('in-app mechanism'),
        'Must document in-app mechanism without leaving the app'
    );

    // 5. Law enforcement and NCMEC reporting
    assert.ok(content.includes('NCMEC') || content.includes('CyberTipline'), 'Must state NCMEC CyberTipline reporting');

    // 6. Valid Child Safety Point of Contact
    assert.ok(content.includes('Godswill Godlife Onah'), 'Must state designated contact person');
    assert.ok(content.includes('childsafety@thecollegedate.com'), 'Must provide dedicated child safety email');
    assert.ok(content.includes('godwillgodslife@gmail.com'), 'Must provide emergency backup contact');
});

test('Settings View: Provides in-app feedback triggers without leaving app', () => {
    const settingsPath = resolve('src/pages/Settings.jsx');
    const content = readFileSync(settingsPath, 'utf8');

    assert.ok(content.includes('InAppFeedbackModal'), 'Settings.jsx must import and use InAppFeedbackModal');
    assert.ok(content.includes('Send In-App Feedback'), 'Settings.jsx must render Send In-App Feedback option');
    assert.ok(content.includes('Report Child Safety Concern'), 'Settings.jsx must render Report Child Safety Concern option');
    assert.ok(content.includes('/child-safety-standards'), 'Settings.jsx must link to child-safety-standards');
});

test('Routing & Redirects: Maps /child-safety and /child-safety-standards properly', () => {
    const redirectsPath = resolve('public/_redirects');
    const redirectsContent = readFileSync(redirectsPath, 'utf8');
    assert.ok(redirectsContent.includes('/child-safety-standards'), 'Redirects must support /child-safety-standards');
    assert.ok(redirectsContent.includes('/child-safety'), 'Redirects must support /child-safety');

    const routesPath = resolve('src/constants/publicSeoRoutes.js');
    const routesContent = readFileSync(routesPath, 'utf8');
    assert.ok(routesContent.includes('child-safety-standards'), 'publicSeoRoutes must include child-safety-standards');
    assert.ok(routesContent.includes('child-safety'), 'publicSeoRoutes must include child-safety');

    const staticViewerPath = resolve('src/pages/public/StaticPageViewer.jsx');
    const staticViewerContent = readFileSync(staticViewerPath, 'utf8');
    assert.ok(staticViewerContent.includes("'child-safety'"), 'StaticPageViewer must support child-safety slug');
});

test('Database Migration: In-app feedback table and RPC function schema defined', () => {
    const migrationPath = resolve('supabase/migrations/20261013140000_in_app_feedback_and_child_safety.sql');
    assert.strictEqual(existsSync(migrationPath), true, 'Migration must exist');
    const sql = readFileSync(migrationPath, 'utf8');

    assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.in_app_feedback'), 'Must create public.in_app_feedback');
    assert.ok(sql.includes('public.submit_in_app_feedback'), 'Must create submit_in_app_feedback RPC');
    assert.ok(sql.includes('child_safety'), 'Must include child_safety category check');
    assert.ok(sql.includes('SECURITY DEFINER'), 'RPC must be SECURITY DEFINER');
});
