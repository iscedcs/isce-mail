'use client';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
	SelectValue,
	SelectTrigger,
	SelectItem,
	SelectContent,
	Select,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useState, useTransition } from 'react';
import { sendMailAction } from '@/action/send-mail';
import { LoaderCircle } from 'lucide-react';

export default function Component() {
	const [form, setForm] = useState({
		subject: '',
		message: '',
		template: '',
		emails: '',
	});
	const [error, setError] = useState<string | undefined>();
	const [success, setSuccess] = useState<string | undefined>();
	const [isPending, startTransition] = useTransition();

	const sendMail = async () => {
		startTransition(() => {
			sendMailAction(form)
				.then((data) => {
					if (data?.error) {
						setError(data?.error);
					}
					if (data?.success) {
						setSuccess(data?.success);
					}
				})
				.catch(() => setError('Something went wrong!!!'));
		});
	};
	return (
		<form
			action={sendMail}
			className='space-y-4 px-4 md:px-6 max-w-3xl mx-auto py-10'
		>
			<div className='space-y-2'>
				<h1 className='text-3xl font-bold'>Send emails</h1>
				<p className='text-gray-500 dark:text-gray-400'>
					Enter your email subject, message, and select a
					template below. Attach a CSV file with your
					recipients&apos; email addresses.
				</p>
			</div>
			<div className='space-y-4'>
				<div className='space-y-2'>
					<Label htmlFor='subject'>Subject</Label>
					<Input
						onChange={(e) => {
							setForm({
								...form,
								subject: e.target.value,
							});
						}}
						id='subject'
						placeholder='Enter your email subject'
						required
						defaultValue={form.subject}
					/>
				</div>
				<div className='space-y-2'>
					<Label htmlFor='message'>Message</Label>
					<Textarea
						onChange={(e) => {
							setForm({
								...form,
								message: e.target.value,
							});
						}}
						className='min-h-[200px]'
						id='message'
						placeholder='Enter your email message'
						required
						defaultValue={form.message}
					/>
				</div>
				<div className='space-y-2'>
					<Label htmlFor='template'>Template</Label>
					<Select
						defaultValue={form.template}
						required
						onValueChange={(e) => {
							setForm({
								...form,
								template: e,
							});
						}}
					>
						<SelectTrigger className='w-full'>
							<SelectValue placeholder='Select a template' />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value='newsletter'>
								Newsletter
							</SelectItem>
							<SelectItem value='promotion'>
								Promotion
							</SelectItem>
							<SelectItem value='announcement'>
								Announcement
							</SelectItem>
							<SelectItem value='event'>Event</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className='space-y-2'>
					<Label htmlFor='emails'>Email List</Label>
					<Textarea
						defaultValue={form.emails}
						onChange={(e) => {
							setForm({
								...form,
								emails: e.target.value,
							});
						}}
						id='emails'
						placeholder='Enter email addresses separated by commas'
						required
					/>
				</div>
				{error && <div className='text-destructive '>{error}</div>}
				{success && (
					<div className='text-emerald-600 '>{success}</div>
				)}
			</div>
			<Button
				type='submit'
				size='lg'
				disabled={isPending}
			>
				{isPending ? (
					<LoaderCircle className='animate-spin h-4 w-4' />
				) : (
					'Send Emails'
				)}
			</Button>
		</form>
	);
}
